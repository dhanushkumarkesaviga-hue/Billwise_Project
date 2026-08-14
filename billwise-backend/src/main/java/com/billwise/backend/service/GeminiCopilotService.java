package com.billwise.backend.service;

import com.billwise.backend.dto.ChatMessageDto;
import com.billwise.backend.entity.ChatMessage;
import com.billwise.backend.entity.Invoice;
import com.billwise.backend.entity.User;
import com.billwise.backend.repository.ChatMessageRepository;
import com.billwise.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class GeminiCopilotService {

    private final RestTemplate restTemplate;
    private final ChatMessageRepository chatMessageRepository;
    private final InvoiceService invoiceService;
    private final UserRepository userRepository;

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    @Value("${gemini.api.model:gemini-flash-latest}")
    private String geminiModel;

    private static final String GEMINI_URL_TEMPLATE =
            "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";

    public List<ChatMessageDto> getHistory(String sessionId) {
        return getHistory(sessionId, null);
    }

    public List<ChatMessageDto> getHistory(String sessionId, String username) {
        if (username != null && !username.isBlank()) {
            List<ChatMessage> userSessionMessages = chatMessageRepository.findByUsernameAndSessionIdOrderByCreatedAtAsc(username, sessionId);
            if (!userSessionMessages.isEmpty()) {
                return userSessionMessages.stream()
                        .map(m -> new ChatMessageDto("model".equals(m.getRole()) ? "ai" : "user", m.getContent()))
                        .toList();
            }
            return Collections.emptyList();
        }
        return chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId).stream()
                .map(m -> new ChatMessageDto("model".equals(m.getRole()) ? "ai" : "user", m.getContent()))
                .toList();
    }

    public String chat(String sessionId, String userMessage) {
        return chat(sessionId, userMessage, null);
    }

    public String chat(String sessionId, String userMessage, String username) {
        boolean hasApiKey = geminiApiKey != null && !geminiApiKey.isBlank() && !geminiApiKey.contains("YOUR_GEMINI_API_KEY");
        String cleanUser = (username != null && !username.isBlank()) ? username : "anonymous";
        String merchantId = null;

        if (username != null && !username.isBlank()) {
            merchantId = userRepository.findByUsername(username)
                    .map(User::getMerchantId)
                    .orElse(null);
        }

        // 1. Fetch live financial context for this merchant/user
        String financialContext = buildFinancialContext(username);

        // 2. Fetch past conversation history strictly for this user & session
        List<ChatMessage> previousHistory = chatMessageRepository.findByUsernameAndSessionIdOrderByCreatedAtAsc(cleanUser, sessionId);

        // 3. Persist the current user's message
        saveMessage(sessionId, "user", userMessage, cleanUser, merchantId);

        String reply = null;

        if (hasApiKey) {
            try {
                Map<String, Object> requestBody = buildGeminiRequest(financialContext, previousHistory, userMessage);
                String url = String.format(GEMINI_URL_TEMPLATE, geminiModel != null && !geminiModel.isBlank() ? geminiModel : "gemini-flash-latest", geminiApiKey);

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

                @SuppressWarnings("unchecked")
                Map<String, Object> response = restTemplate.postForObject(url, entity, Map.class);
                reply = extractReplyText(response);
            } catch (Exception ex) {
                log.warn("Gemini API call failed ({}). Falling back to comprehensive ledger copilot.", ex.getMessage());
            }
        }

        // If Gemini is not configured, threw error, or returned empty text, use robust ledger engine
        if (reply == null || reply.isBlank()) {
            reply = heuristicReply(userMessage, username);
        }

        // 4. Persist the assistant's reply scoped to this user & session
        saveMessage(sessionId, "model", reply, cleanUser, merchantId);

        return reply;
    }

    private String heuristicReply(String userMessage, String username) {
        String lower = (userMessage != null) ? userMessage.toLowerCase() : "";
        List<Invoice> invoices = (username != null && !username.isBlank())
                ? invoiceService.getAllInvoices(username)
                : invoiceService.getAllInvoices();

        BigDecimal totalSpend = invoices.stream()
                .map(Invoice::getTotalAmount).filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal eligibleItc = invoices.stream()
                .filter(i -> i.getItcEligibility() != null && i.getItcEligibility().toLowerCase().contains("eligible") && !i.getItcEligibility().toLowerCase().contains("ineligible"))
                .map(Invoice::getItcAmount).filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal blockedItc = invoices.stream()
                .filter(i -> i.getItcEligibility() != null && i.getItcEligibility().toLowerCase().contains("ineligible"))
                .map(i -> nz(i.getCgst()).add(nz(i.getSgst())).add(nz(i.getIgst())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<Invoice> flaggedInvoices = invoices.stream()
                .filter(i -> "Flagged".equalsIgnoreCase(i.getStatus()))
                .toList();

        List<Invoice> blockedInvoices = invoices.stream()
                .filter(i -> (i.getItcEligibility() != null && i.getItcEligibility().toLowerCase().contains("ineligible"))
                        || (i.getCategory() != null && (i.getCategory().toLowerCase().contains("food") || i.getCategory().toLowerCase().contains("hospitality") || i.getCategory().toLowerCase().contains("hotel"))))
                .toList();

        if (lower.contains("block") || lower.contains("17(5)") || lower.contains("ineligible")) {
            if (!blockedInvoices.isEmpty()) {
                StringBuilder sb = new StringBuilder("Under **Section 17(5) of the CGST Act**, the following invoices have blocked/ineligible input tax credit:\n\n");
                for (Invoice inv : blockedInvoices) {
                    sb.append("• **").append(inv.getVendorName() != null ? inv.getVendorName() : "Vendor").append("** — Total: **₹")
                      .append(inv.getTotalAmount()).append("** (Category: ").append(inv.getCategory() != null ? inv.getCategory() : "Ineligible Supply")
                      .append("). ITC is blocked under Sec 17(5).\n");
                }
                sb.append("\nTotal Blocked ITC: **₹").append(blockedItc).append("**. Ensure these are excluded from GSTR-3B Table 4(A) to avoid audit penalties.");
                return sb.toString();
            } else {
                return "Under **Section 17(5) of the CGST Act**, items like food & beverages, personal motor vehicles, club memberships, and personal expenses are blocked from Input Tax Credit. In your current invoice ledger, you have **₹" + blockedItc + "** in blocked ITC across recorded bills.";
            }
        }

        if (lower.contains("itc") || lower.contains("credit") || lower.contains("claim")) {
            return "Based on your verified invoice ledger:\n\n"
                    + "• **Eligible ITC (Claimable)**: **₹" + eligibleItc + "** (Ready for GSTR-3B offset)\n"
                    + "• **Blocked ITC (Section 17(5))**: **₹" + blockedItc + "** (Ineligible)\n\n"
                    + "Your claimable ITC is calculated from all valid B2B tax invoices where supplier GSTINs and tax rates match statutory guidelines.";
        }

        if (lower.contains("vendor") || lower.contains("high-value") || lower.contains("spend") || lower.contains("expense")) {
            List<Invoice> topVendors = invoices.stream()
                    .sorted((a, b) -> (b.getTotalAmount() != null ? b.getTotalAmount() : BigDecimal.ZERO)
                            .compareTo(a.getTotalAmount() != null ? a.getTotalAmount() : BigDecimal.ZERO))
                    .limit(5)
                    .toList();

            StringBuilder sb = new StringBuilder("Here is your recorded spend overview across **" + invoices.size() + " invoice(s)** with total spend of **₹" + totalSpend + "**:\n\n");
            for (Invoice inv : topVendors) {
                sb.append("• **").append(inv.getVendorName() != null ? inv.getVendorName() : "Vendor").append("**: **₹")
                  .append(inv.getTotalAmount()).append("** (Invoice: ").append(inv.getInvoiceNumber() != null ? inv.getInvoiceNumber() : "N/A")
                  .append(", Category: ").append(inv.getCategory() != null ? inv.getCategory() : "General").append(")\n");
            }
            return sb.toString();
        }

        if (lower.contains("deadline") || lower.contains("due") || lower.contains("file") || lower.contains("gstr")) {
            return "Upcoming Statutory GST Filing Deadlines:\n\n"
                    + "• **GSTR-1** (Outward Supplies): **11th of each month** (Monthly) or **13th of month following quarter** (QRMP)\n"
                    + "• **GSTR-2B** (Auto-drafted ITC Statement): Available on **14th of each month**\n"
                    + "• **GSTR-3B** (Summary Return & Tax Payment): **20th of each month** (Monthly) or **22nd/24th** (QRMP State-wise)\n"
                    + "• **GSTR-9 & 9C** (Annual Return & Reconciliation): Mandatory for aggregate turnover > ₹2 Cr / ₹5 Cr by **31st December**.";
        }

        if (lower.contains("flag") || lower.contains("risk") || lower.contains("mismatch")) {
            if (!flaggedInvoices.isEmpty()) {
                StringBuilder sb = new StringBuilder("You currently have **" + flaggedInvoices.size() + " flagged invoice(s)** requiring review:\n\n");
                for (Invoice inv : flaggedInvoices) {
                    sb.append("• **").append(inv.getVendorName()).append("** (₹").append(inv.getTotalAmount()).append(") - Review GSTIN or tax mismatch.\n");
                }
                return sb.toString();
            } else {
                return "All recorded invoices in your ledger are currently verified with zero active compliance flags or GSTIN discrepancies.";
            }
        }

        return "I am your **BillWise AI Financial & GST Assistant**. Currently tracking **" + invoices.size() + " invoice(s)** with total spend of **₹" + totalSpend + "** and eligible ITC of **₹" + eligibleItc + "**.\n\n"
                + "You can ask me about:\n"
                + "• Claimable vs Blocked ITC (Section 17(5))\n"
                + "• High-value vendor spend and expense categories\n"
                + "• Statutory GST return deadlines (GSTR-1, GSTR-3B, GSTR-9)\n"
                + "• Flagged invoices and compliance risks";
    }

    public void clearHistory(String sessionId) {
        clearHistory(sessionId, null);
    }

    public void clearHistory(String sessionId, String username) {
        if (username != null && !username.isBlank()) {
            chatMessageRepository.deleteByUsernameAndSessionId(username, sessionId);
        } else {
            chatMessageRepository.deleteBySessionId(sessionId);
        }
    }

    private void saveMessage(String sessionId, String role, String content, String username, String merchantId) {
        ChatMessage message = new ChatMessage();
        message.setSessionId(sessionId);
        message.setRole(role);
        message.setContent(content);
        message.setUsername(username);
        message.setMerchantId(merchantId);
        chatMessageRepository.save(message);
    }

    private String buildFinancialContext(String username) {
        List<Invoice> invoices = (username != null && !username.isBlank())
                ? invoiceService.getAllInvoices(username)
                : invoiceService.getAllInvoices();

        BigDecimal totalSpend = invoices.stream()
                .map(Invoice::getTotalAmount).filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal eligibleItc = invoices.stream()
                .filter(i -> i.getItcEligibility() != null && i.getItcEligibility().toLowerCase().contains("eligible") && !i.getItcEligibility().toLowerCase().contains("ineligible"))
                .map(Invoice::getItcAmount).filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal blockedItc = invoices.stream()
                .filter(i -> i.getItcEligibility() != null && i.getItcEligibility().toLowerCase().contains("ineligible"))
                .map(i -> nz(i.getCgst()).add(nz(i.getSgst())).add(nz(i.getIgst())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<String> flagged = invoices.stream()
                .filter(i -> "Flagged".equalsIgnoreCase(i.getStatus()))
                .map(i -> i.getVendorName() + " (₹" + i.getTotalAmount() + ")")
                .toList();

        List<String> blockedDetails = invoices.stream()
                .filter(i -> (i.getItcEligibility() != null && i.getItcEligibility().toLowerCase().contains("ineligible"))
                        || (i.getCategory() != null && (i.getCategory().toLowerCase().contains("food") || i.getCategory().toLowerCase().contains("hotel"))))
                .map(i -> i.getVendorName() + " (₹" + i.getTotalAmount() + ", Category: " + i.getCategory() + ")")
                .toList();

        StringBuilder sb = new StringBuilder();
        sb.append("You are BillWise AI Copilot, an expert Indian GST & MSME Financial Assistant. ");
        sb.append("Provide complete, well-structured, professional, and clear answers using Indian Rupees (₹). ");
        sb.append("Use bullet points and bold highlights for readability. Always complete your thoughts fully.\n\n");
        sb.append("Current Live Business Ledger Data:\n");
        sb.append("- Total Invoices: ").append(invoices.size()).append("\n");
        sb.append("- Total Recorded Spend: ₹").append(totalSpend).append("\n");
        sb.append("- Eligible Input Tax Credit (ITC): ₹").append(eligibleItc).append("\n");
        sb.append("- Ineligible / Blocked ITC (Section 17(5)): ₹").append(blockedItc).append("\n");
        sb.append("- Invoices with Blocked ITC: ").append(blockedDetails.isEmpty() ? "None" : String.join("; ", blockedDetails)).append("\n");
        sb.append("- Flagged Invoices: ").append(flagged.isEmpty() ? "None" : String.join("; ", flagged)).append("\n");

        return sb.toString();
    }

    private BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    private Map<String, Object> buildGeminiRequest(String systemContext, List<ChatMessage> history, String currentUserMessage) {
        List<Map<String, Object>> contents = new ArrayList<>();

        // Include the last 6 messages from conversation history for multi-turn context
        int startIdx = Math.max(0, history.size() - 6);
        for (int i = startIdx; i < history.size(); i++) {
            ChatMessage m = history.get(i);
            String role = "user".equalsIgnoreCase(m.getRole()) ? "user" : "model";
            if (m.getContent() != null && !m.getContent().isBlank()) {
                contents.add(Map.of(
                        "role", role,
                        "parts", List.of(Map.of("text", m.getContent()))
                ));
            }
        }

        // Add current user message
        contents.add(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", currentUserMessage))
        ));

        Map<String, Object> body = new HashMap<>();
        body.put("contents", contents);
        body.put("system_instruction", Map.of(
                "parts", List.of(Map.of("text", systemContext))
        ));
        body.put("generationConfig", Map.of(
                "temperature", 0.4,
                "maxOutputTokens", 2048
        ));

        return body;
    }

    @SuppressWarnings("unchecked")
    private String extractReplyText(Map<String, Object> response) {
        try {
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
            if (candidates != null && !candidates.isEmpty()) {
                Map<String, Object> firstCandidate = candidates.get(0);
                Map<String, Object> content = (Map<String, Object>) firstCandidate.get("content");
                if (content != null) {
                    List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
                    if (parts != null && !parts.isEmpty()) {
                        String text = (String) parts.get(0).get("text");
                        if (text != null && !text.isBlank()) {
                            return text.trim();
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Unexpected Gemini response shape: {}", response);
        }
        return null;
    }
}
