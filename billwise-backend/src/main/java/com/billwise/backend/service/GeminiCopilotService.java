package com.billwise.backend.service;

import com.billwise.backend.dto.ChatMessageDto;
import com.billwise.backend.entity.ChatMessage;
import com.billwise.backend.entity.Invoice;
import com.billwise.backend.repository.ChatMessageRepository;
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

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    @Value("${gemini.api.model:gemini-flash-latest}")
    private String geminiModel;

    private static final String GEMINI_URL_TEMPLATE =
            "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";

    public List<ChatMessageDto> getHistory(String sessionId) {
        return chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId).stream()
                .map(m -> new ChatMessageDto("model".equals(m.getRole()) ? "ai" : "user", m.getContent()))
                .toList();
    }

    public String chat(String sessionId, String userMessage) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            throw new IllegalStateException(
                    "GEMINI_API_KEY is not configured. Set it as an environment variable before starting the app.");
        }

        // 1. Persist the user's message
        saveMessage(sessionId, "user", userMessage);

        // 2. Build financial context from the current invoice data (never let
        //    the model invent figures — the real numbers come from the DB).
        String financialContext = buildFinancialContext();

        // 3. Replay the full conversation history (stateless API, so history
        //    must be resent every call).
        List<ChatMessage> history = chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);

        Map<String, Object> requestBody = buildGeminiRequest(financialContext, history);

        String url = String.format(GEMINI_URL_TEMPLATE, geminiModel, geminiApiKey);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        String reply;
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(url, entity, Map.class);
            reply = extractReplyText(response);
        } catch (Exception ex) {
            log.error("Gemini API call failed", ex);
            reply = "Sorry, I couldn't reach the AI service right now. Please try again in a moment.";
        }

        // 4. Persist the assistant's reply so it's included next time.
        saveMessage(sessionId, "model", reply);

        return reply;
    }

    public void clearHistory(String sessionId) {
        chatMessageRepository.deleteBySessionId(sessionId);
    }

    private void saveMessage(String sessionId, String role, String content) {
        ChatMessage message = new ChatMessage();
        message.setSessionId(sessionId);
        message.setRole(role);
        message.setContent(content);
        chatMessageRepository.save(message);
    }

    // Builds a system-style context block with real, DB-backed figures.
    private String buildFinancialContext() {
        List<Invoice> invoices = invoiceService.getAllInvoices();

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

        List<String> flagged = invoices.stream()
                .filter(i -> "Flagged".equalsIgnoreCase(i.getStatus()))
                .map(i -> i.getVendorName() + " (Rs. " + i.getTotalAmount() + ")")
                .toList();

        StringBuilder sb = new StringBuilder();
        sb.append("You are the BillWise AI Copilot, a GST compliance and invoice financial assistant for an ")
          .append("Indian MSME. Answer only using the data below and general GST knowledge. Keep answers concise ")
          .append("(2-4 sentences) and use INR (Rs.) formatting.\n\n");
        sb.append("Current invoice data snapshot:\n");
        sb.append("- Total invoices: ").append(invoices.size()).append("\n");
        sb.append("- Total spend: Rs. ").append(totalSpend).append("\n");
        sb.append("- Total eligible ITC (Input Tax Credit): Rs. ").append(eligibleItc).append("\n");
        sb.append("- Total blocked/ineligible ITC (e.g. Sec 17(5)): Rs. ").append(blockedItc).append("\n");
        sb.append("- Flagged invoices: ").append(flagged.isEmpty() ? "none" : String.join(", ", flagged)).append("\n");

        return sb.toString();
    }

    private BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    // Gemini generateContent request format:
    // { "contents": [ {"role": "user"|"model", "parts": [{"text": "..."}]}, ... ] }
    private Map<String, Object> buildGeminiRequest(String systemContext, List<ChatMessage> history) {
        List<Map<String, Object>> contents = new ArrayList<>();

        // Prepend the financial context as the first user turn, with a short
        // model acknowledgement, so it behaves like a system prompt.
        contents.add(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", systemContext))
        ));
        contents.add(Map.of(
                "role", "model",
                "parts", List.of(Map.of("text", "Understood. I'll answer using that invoice and GST data."))
        ));

        for (ChatMessage m : history) {
            contents.add(Map.of(
                    "role", m.getRole(),
                    "parts", List.of(Map.of("text", m.getContent()))
            ));
        }

        Map<String, Object> generationConfig = Map.of(
                "temperature", 0.4,
                "maxOutputTokens", 400
        );

        Map<String, Object> body = new HashMap<>();
        body.put("contents", contents);
        body.put("generationConfig", generationConfig);
        return body;
    }

    @SuppressWarnings("unchecked")
    private String extractReplyText(Map<String, Object> response) {
        try {
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            return (String) parts.get(0).get("text");
        } catch (Exception e) {
            log.warn("Unexpected Gemini response shape: {}", response);
            return "I received an unexpected response from the AI service. Please try again.";
        }
    }
}
