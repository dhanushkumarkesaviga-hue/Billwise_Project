package com.billwise.invoice.service;

import com.billwise.invoice.dto.InvoiceDtos.ChatRequest;
import com.billwise.invoice.dto.InvoiceDtos.ChatResponse;
import com.billwise.invoice.entity.ChatMessage;
import com.billwise.invoice.entity.GstDeadline;
import com.billwise.invoice.entity.Invoice;
import com.billwise.invoice.repository.ChatMessageRepository;
import com.billwise.invoice.repository.GstDeadlineRepository;
import com.billwise.invoice.repository.InvoiceRepository;
import com.billwise.invoice.security.AuthenticatedUser;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.*;

@Slf4j
@Service
public class OllamaCopilotService {

    private final RestTemplate restTemplate;
    private final ChatMessageRepository chatMessageRepository;
    private final InvoiceRepository invoiceRepository;
    private final GstDeadlineRepository gstDeadlineRepository;
    private final String baseUrl;
    private final String model;

    public OllamaCopilotService(
            RestTemplateBuilder restTemplateBuilder,
            ChatMessageRepository chatMessageRepository,
            InvoiceRepository invoiceRepository,
            GstDeadlineRepository gstDeadlineRepository,
            @Value("${ollama.base-url:http://localhost:11434}") String baseUrl,
            @Value("${ollama.model:llama3:latest}") String model,
            @Value("${ollama.timeout-seconds:60}") long timeoutSeconds) {
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofSeconds(10))
                .setReadTimeout(Duration.ofSeconds(timeoutSeconds))
                .build();
        this.chatMessageRepository = chatMessageRepository;
        this.invoiceRepository = invoiceRepository;
        this.gstDeadlineRepository = gstDeadlineRepository;
        this.baseUrl = (baseUrl != null && !baseUrl.isBlank()) ? baseUrl.trim() : "http://localhost:11434";
        this.model = (model != null && !model.isBlank()) ? model.trim() : "llama3:latest";
    }

    public ChatResponse chat(ChatRequest request, AuthenticatedUser user) {
        String sessionId = request.getSessionId();
        if (sessionId == null || sessionId.isBlank()) {
            sessionId = UUID.randomUUID().toString();
        }

        saveMessage(sessionId, "user", request.getMessage(), user != null ? user.getMerchantId() : null);

        String reply;
        try {
            reply = callOllama(sessionId, request.getMessage(), user);
        } catch (Exception ex) {
            log.warn("Ollama chat failed against [{}/api/chat]: {}. Falling back to rule-based ledger assistant.", baseUrl, ex.getMessage());
            reply = heuristicReply(request.getMessage(), user);
        }

        saveMessage(sessionId, "assistant", reply, user != null ? user.getMerchantId() : null);
        return new ChatResponse(reply, sessionId);
    }

    public List<ChatMessage> getHistory(String sessionId) {
        return chatMessageRepository.findBySessionIdOrderByTimestampAsc(sessionId);
    }

    private void saveMessage(String sessionId, String role, String content, String merchantId) {
        ChatMessage message = new ChatMessage();
        message.setSessionId(sessionId);
        message.setRole(role);
        message.setContent(content);
        message.setMerchantId(merchantId);
        chatMessageRepository.save(message);
    }

    private String buildFinancialContext(AuthenticatedUser user) {
        List<Invoice> invoices = (user == null || user.isSuperAdmin() || user.getMerchantId() == null)
                ? invoiceRepository.findAll()
                : invoiceRepository.findByMerchantId(user.getMerchantId());

        BigDecimal totalSpend = invoices.stream()
                .map(Invoice::getTotalAmount).filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal eligibleItc = invoices.stream()
                .filter(i -> i.getItcEligibility() != null && i.getItcEligibility().contains("Eligible"))
                .map(Invoice::getItcAmount).filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal blockedItc = invoices.stream()
                .filter(i -> i.getItcEligibility() != null && i.getItcEligibility().contains("Ineligible"))
                .map(i -> nz(i.getCgst()).add(nz(i.getSgst())).add(nz(i.getIgst())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<GstDeadline> deadlines = gstDeadlineRepository.findAll();

        return String.format(
                "Total Invoices: %d | Total Spend: Rs. %s | Eligible ITC: Rs. %s | Blocked ITC (Sec 17(5)): Rs. %s | Statutory Deadlines Tracked: %d",
                invoices.size(), totalSpend, eligibleItc, blockedItc, deadlines.size()
        );
    }

    private String callOllama(String sessionId, String userMessage, AuthenticatedUser user) {
        String context = buildFinancialContext(user);
        String systemInstruction = """
                You are BillWise Copilot, an expert Indian Chartered Accountant and GST tax compliance assistant.
                You have real-time access to the merchant's financial books and tax ledger:
                %s
                
                Guidelines:
                - Provide clear, direct, and actionable answers on Indian GST rules (GSTR-1, GSTR-3B, ITC Section 17(5), HSN/SAC codes, reverse charge).
                - Ground your answers in the merchant's financial ledger numbers provided above.
                - Keep explanations concise, professional, and easy to understand for MSME business owners.
                """.formatted(context);

        String url = String.format("%s/api/chat", baseUrl);

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemInstruction));

        // Include recent conversation context if available
        List<ChatMessage> history = chatMessageRepository.findBySessionIdOrderByTimestampAsc(sessionId);
        if (history != null && !history.isEmpty()) {
            int startIdx = Math.max(0, history.size() - 6); // Last 6 messages for context
            for (int i = startIdx; i < history.size(); i++) {
                ChatMessage m = history.get(i);
                String role = "assistant".equalsIgnoreCase(m.getRole()) || "model".equalsIgnoreCase(m.getRole()) ? "assistant" : "user";
                messages.add(Map.of("role", role, "content", m.getContent()));
            }
        } else {
            messages.add(Map.of("role", "user", "content", userMessage));
        }

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", messages,
                "stream", false,
                "options", Map.of(
                        "temperature", 0.3,
                        "num_predict", 512
                )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        Map<?, ?> response = restTemplate.postForObject(url, entity, Map.class);

        return extractOllamaReply(response);
    }

    private String extractOllamaReply(Map<?, ?> response) {
        if (response != null && response.containsKey("message")) {
            Object msgObj = response.get("message");
            if (msgObj instanceof Map<?, ?> msgMap && msgMap.containsKey("content")) {
                String content = String.valueOf(msgMap.get("content"));
                if (content != null && !content.isBlank()) {
                    return content.trim();
                }
            }
        }
        return "I have reviewed your financial ledger and GST records. How can I assist you with GSTR-1, GSTR-3B, or ITC optimization today?";
    }

    private String heuristicReply(String userMessage, AuthenticatedUser user) {
        String lower = userMessage.toLowerCase();
        String context = buildFinancialContext(user);

        if (lower.contains("itc") || lower.contains("credit") || lower.contains("input tax")) {
            return "Based on your current invoices, " + context + ". Ensure all supplier GSTINs are active and uploaded in GSTR-1 so they appear in your GSTR-2B before filing GSTR-3B.";
        }
        if (lower.contains("deadline") || lower.contains("due") || lower.contains("file")) {
            return "Your primary upcoming GST deadlines are: GSTR-1 (due 11th of month) and GSTR-3B (due 20th of month). File on time to avoid statutory late fees.";
        }
        return "BillWise Copilot (Local Assistant): I am tracking your invoice ledger (" + context + "). You can ask me about Section 17(5) blocked credit, GSTR-3B reconciliation, or tax savings.";
    }

    private BigDecimal nz(BigDecimal val) {
        return val == null ? BigDecimal.ZERO : val;
    }
}
