package com.billwise.backend.service;

import com.billwise.backend.dto.ClassifyResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class InvoiceClassificationService {

    private final RestTemplate restTemplate;

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    @Value("${gemini.api.model:gemini-flash-latest}")
    private String geminiModel;

    private static final String GEMINI_URL_TEMPLATE =
            "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";

    public ClassifyResponse classify(String ocrText, String vendorNameHint) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            throw new IllegalStateException(
                    "GEMINI_API_KEY is not configured. Set it as an environment variable before starting the app.");
        }

        String prompt = buildPrompt(ocrText, vendorNameHint);
        Map<String, Object> requestBody = buildGeminiRequest(prompt);

        String url = String.format(GEMINI_URL_TEMPLATE, geminiModel, geminiApiKey);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        String rawAnswer;
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(url, entity, Map.class);
            rawAnswer = extractReplyText(response);
        } catch (Exception ex) {
            log.error("Gemini classification call failed", ex);
            return new ClassifyResponse(InvoiceCategories.FALLBACK_CATEGORY, true);
        }

        return matchToAllowedCategory(rawAnswer);
    }

    // Keeps the request small and cheap: a short, constrained prompt with a
    // low output token cap, since we only need one category name back.
    private String buildPrompt(String ocrText, String vendorNameHint) {
        String truncatedText = ocrText.length() > 1500 ? ocrText.substring(0, 1500) : ocrText;

        StringBuilder sb = new StringBuilder();
        sb.append("Classify this Indian GST invoice into exactly ONE category from this exact list ");
        sb.append("(reply with only the category text, nothing else, no punctuation, no explanation):\n");
        sb.append(String.join(" | ", InvoiceCategories.ALLOWED_CATEGORIES)).append("\n\n");

        if (vendorNameHint != null && !vendorNameHint.isBlank()) {
            sb.append("Vendor name: ").append(vendorNameHint).append("\n");
        }

        sb.append("OCR-extracted invoice text:\n").append(truncatedText);
        return sb.toString();
    }

    private Map<String, Object> buildGeminiRequest(String prompt) {
        List<Map<String, Object>> contents = List.of(
                Map.of("role", "user", "parts", List.of(Map.of("text", prompt)))
        );

        // Low token cap keeps each classification call cheap and fast --
        // we only expect a short category label back, not prose.
        Map<String, Object> generationConfig = Map.of(
                "temperature", 0.1,
                "maxOutputTokens", 500
        );

        return Map.of(
                "contents", contents,
                "generationConfig", generationConfig
        );
    }

    @SuppressWarnings("unchecked")
    private String extractReplyText(Map<String, Object> response) {
        try {
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            return (String) parts.get(0).get("text");
        } catch (Exception e) {
            log.warn("Unexpected Gemini response shape during classification: {}", response);
            return "";
        }
    }

    // Gemini is asked to reply with only a category name, but models can
    // still add stray punctuation/casing, so we normalize and validate
    // against the closed list rather than trusting the raw text outright.
    private ClassifyResponse matchToAllowedCategory(String rawAnswer) {
        if (rawAnswer == null) {
            return new ClassifyResponse(InvoiceCategories.FALLBACK_CATEGORY, true);
        }

        String cleaned = rawAnswer.replaceAll("[\"'.]", "").trim();

        for (String allowed : InvoiceCategories.ALLOWED_CATEGORIES) {
            if (allowed.equalsIgnoreCase(cleaned)) {
                return new ClassifyResponse(allowed, false);
            }
        }

        // loose contains-match fallback, in case the model wraps the
        // category in a short sentence despite instructions
        for (String allowed : InvoiceCategories.ALLOWED_CATEGORIES) {
            if (cleaned.toLowerCase().contains(allowed.toLowerCase())) {
                return new ClassifyResponse(allowed, true);
            }
        }

        return new ClassifyResponse(InvoiceCategories.FALLBACK_CATEGORY, true);
    }
}
