package com.billwise.invoice.service;

import com.billwise.invoice.dto.InvoiceDtos.VlmExtractionRequest;
import com.billwise.invoice.dto.InvoiceDtos.VlmExtractionResponse;
import com.billwise.invoice.dto.InvoiceDtos.VlmExtractionResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
public class OllamaVisionService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String baseUrl;
    private final String configuredModel;

    private static final List<String> PREFERRED_VISION_MODELS = List.of(
            "llama3.2-vision:latest",
            "llama3.2-vision:11b",
            "llama3.2-vision",
            "qwen2-vl:latest",
            "qwen2-vl:7b",
            "qwen2-vl",
            "llava:latest",
            "llava:13b",
            "llava:7b",
            "llava",
            "bakllava:latest",
            "bakllava"
    );

    public OllamaVisionService(
            RestTemplateBuilder restTemplateBuilder,
            ObjectMapper objectMapper,
            @Value("${ollama.base-url:http://localhost:11434}") String baseUrl,
            @Value("${ollama.vision-model:llama3.2-vision:latest}") String configuredModel,
            @Value("${ollama.vision-timeout-seconds:120}") long timeoutSeconds) {
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofSeconds(15))
                .setReadTimeout(Duration.ofSeconds(timeoutSeconds))
                .build();
        this.objectMapper = objectMapper;
        this.baseUrl = (baseUrl != null && !baseUrl.isBlank()) ? baseUrl.trim() : "http://localhost:11434";
        this.configuredModel = (configuredModel != null && !configuredModel.isBlank()) ? configuredModel.trim() : "llama3.2-vision:latest";
    }

    public VlmExtractionResponse extractInvoice(VlmExtractionRequest request) {
        if (request == null || request.getImageBase64() == null || request.getImageBase64().isBlank()) {
            return new VlmExtractionResponse(false, null, null, null, "Image base64 data is required", false);
        }

        String cleanedBase64 = sanitizeBase64(request.getImageBase64());
        if (cleanedBase64.isEmpty()) {
            return new VlmExtractionResponse(false, null, null, null, "Invalid or empty image base64 data", false);
        }

        String modelToUse = resolveVisionModel();

        try {
            String prompt = buildPrompt();
            String rawReply = callOllamaVision(modelToUse, prompt, cleanedBase64);

            if (rawReply == null || rawReply.isBlank()) {
                return new VlmExtractionResponse(false, modelToUse, null, null, "Empty response from Ollama vision model", false);
            }

            VlmExtractionResult result = parseAndSanitizeJson(rawReply);
            if (result == null) {
                return new VlmExtractionResponse(false, modelToUse, null, rawReply, "Failed to parse structured JSON from vision model", false);
            }

            boolean arithmeticValid = checkArithmetic(result);

            return new VlmExtractionResponse(true, modelToUse, result, rawReply, null, arithmeticValid);

        } catch (Exception ex) {
            log.warn("Ollama vision extraction failed [model={} against {}]: {}", modelToUse, baseUrl, ex.getMessage());
            return new VlmExtractionResponse(false, modelToUse, null, null, "Vision model extraction unavailable: " + ex.getMessage(), false);
        }
    }

    private String resolveVisionModel() {
        try {
            String tagsUrl = String.format("%s/api/tags", baseUrl);
            Map<?, ?> tagsResponse = restTemplate.getForObject(tagsUrl, Map.class);
            if (tagsResponse != null && tagsResponse.containsKey("models")) {
                Object modelsObj = tagsResponse.get("models");
                if (modelsObj instanceof List<?> modelsList) {
                    Set<String> installedNames = new HashSet<>();
                    for (Object item : modelsList) {
                        if (item instanceof Map<?, ?> modelMap && modelMap.containsKey("name")) {
                            installedNames.add(String.valueOf(modelMap.get("name")).toLowerCase());
                        }
                    }

                    // Check preferred vision models in order of priority
                    for (String preferred : PREFERRED_VISION_MODELS) {
                        if (installedNames.contains(preferred.toLowerCase()) || 
                            installedNames.stream().anyMatch(n -> n.startsWith(preferred.split(":")[0]))) {
                            return preferred;
                        }
                    }

                    // If configured model is in installed list, use it
                    if (installedNames.contains(configuredModel.toLowerCase())) {
                        return configuredModel;
                    }
                }
            }
        } catch (Exception e) {
            log.debug("Could not query Ollama tags (Ollama may be offline or starting up): {}", e.getMessage());
        }

        return configuredModel;
    }

    private String buildPrompt() {
        return """
                You are a precision Indian GST tax invoice data extractor.
                Analyze the provided invoice image and extract all financial and legal fields.
                
                You MUST return ONLY a valid, parseable JSON object matching this exact schema:
                {
                  "vendorName": "Full legal/business name of supplier or vendor",
                  "gstin": "15-character Indian GST Identification Number of supplier",
                  "invoiceNumber": "Invoice serial number or bill number",
                  "invoiceDate": "YYYY-MM-DD",
                  "hsnSac": "HSN or SAC tariff code",
                  "taxableAmount": 0.0,
                  "gstRate": 0.0,
                  "cgst": 0.0,
                  "sgst": 0.0,
                  "igst": 0.0,
                  "totalAmount": 0.0
                }
                
                Extraction Rules:
                1. vendorName: Extract the supplier/seller company name at the top or header of the bill (not the customer/buyer).
                2. gstin: 15-character alphanumeric GSTIN of the supplier (e.g. 21AAACI7904G1ZN).
                3. invoiceDate: Convert any date into ISO YYYY-MM-DD format (e.g. 28/07/2026 -> 2026-07-28).
                4. taxableAmount: Net subtotal / premium value without taxes.
                5. gstRate: Overall or predominant GST rate percentage (e.g. 5, 12, 18, 28).
                6. cgst, sgst, igst: Numeric tax amounts.
                7. totalAmount: Grand total / invoice total / amount payable inclusive of all taxes.
                8. Return strictly 0.0 for any numeric field not found and empty string "" for text fields.
                9. DO NOT include markdown explanations, preface, or notes. Output valid JSON only.
                """;
    }

    private String callOllamaVision(String model, String prompt, String base64Image) {
        String url = String.format("%s/api/generate", baseUrl);

        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("prompt", prompt);
        body.put("images", List.of(base64Image));
        body.put("stream", false);
        body.put("format", "json");
        body.put("options", Map.of(
                "temperature", 0.1,
                "num_predict", 768
        ));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        Map<?, ?> response = restTemplate.postForObject(url, entity, Map.class);

        if (response != null && response.containsKey("response")) {
            Object replyObj = response.get("response");
            if (replyObj != null) {
                return String.valueOf(replyObj).trim();
            }
        }

        return null;
    }

    public VlmExtractionResult parseAndSanitizeJson(String rawText) {
        if (rawText == null || rawText.isBlank()) return null;

        String jsonCandidate = extractJsonString(rawText);
        if (jsonCandidate == null || jsonCandidate.isBlank()) return null;

        try {
            JsonNode root = objectMapper.readTree(jsonCandidate);

            VlmExtractionResult result = new VlmExtractionResult();
            result.setVendorName(cleanString(getNodeText(root, "vendorName", "vendor_name", "supplierName", "sellerName")));
            result.setGstin(cleanGstin(getNodeText(root, "gstin", "vendorGstin", "supplierGstin", "gst_number")));
            result.setInvoiceNumber(cleanString(getNodeText(root, "invoiceNumber", "invoice_number", "billNumber", "invNo")));
            result.setInvoiceDate(normalizeDate(getNodeText(root, "invoiceDate", "invoice_date", "date", "billDate")));
            result.setHsnSac(cleanString(getNodeText(root, "hsnSac", "hsn_sac", "hsnCode", "sacCode")));

            result.setTaxableAmount(parseNumeric(root, "taxableAmount", "taxable_amount", "taxableValue", "subtotal", "subTotal"));
            result.setGstRate(parseNumeric(root, "gstRate", "gst_rate", "rate", "taxRate"));
            result.setCgst(parseNumeric(root, "cgst", "cgstAmount", "cgst_amount"));
            result.setSgst(parseNumeric(root, "sgst", "sgstAmount", "sgst_amount"));
            result.setIgst(parseNumeric(root, "igst", "igstAmount", "igst_amount"));
            result.setTotalAmount(parseNumeric(root, "totalAmount", "total_amount", "grandTotal", "invoiceTotal", "total"));

            // If grand total or taxes need reconciliation
            reconcileInternalFinancials(result);

            return result;
        } catch (Exception e) {
            log.warn("Failed to parse JSON node from vision response: {}. Raw was: {}", e.getMessage(), rawText);
            return null;
        }
    }

    private String extractJsonString(String raw) {
        String s = raw.trim();
        // Strip markdown code fences if present
        if (s.startsWith("```")) {
            s = s.replaceFirst("^```(?:json)?\\s*", "");
            s = s.replaceFirst("\\s*```$", "");
            s = s.trim();
        }

        int firstBrace = s.indexOf('{');
        int lastBrace = s.lastIndexOf('}');
        if (firstBrace != -1 && lastBrace != -1 && lastBrace > firstBrace) {
            return s.substring(firstBrace, lastBrace + 1);
        }

        return s;
    }

    private String getNodeText(JsonNode root, String... fieldNames) {
        for (String name : fieldNames) {
            if (root.has(name) && !root.get(name).isNull()) {
                String text = root.get(name).asText();
                if (text != null && !text.isBlank()) {
                    return text.trim();
                }
            }
        }
        return "";
    }

    private Double parseNumeric(JsonNode root, String... fieldNames) {
        for (String name : fieldNames) {
            if (root.has(name) && !root.get(name).isNull()) {
                JsonNode node = root.get(name);
                if (node.isNumber()) {
                    return node.asDouble();
                }
                String text = node.asText();
                if (text != null && !text.isBlank()) {
                    try {
                        String cleaned = text.replaceAll("[^0-9.]", "");
                        if (!cleaned.isEmpty()) {
                            return Double.parseDouble(cleaned);
                        }
                    } catch (NumberFormatException ignored) {
                    }
                }
            }
        }
        return 0.0;
    }

    private void reconcileInternalFinancials(VlmExtractionResult res) {
        double taxable = res.getTaxableAmount() != null ? res.getTaxableAmount() : 0.0;
        double cgst = res.getCgst() != null ? res.getCgst() : 0.0;
        double sgst = res.getSgst() != null ? res.getSgst() : 0.0;
        double igst = res.getIgst() != null ? res.getIgst() : 0.0;
        double total = res.getTotalAmount() != null ? res.getTotalAmount() : 0.0;
        double rate = res.getGstRate() != null ? res.getGstRate() : 0.0;

        double taxSum = cgst + sgst + igst;

        // If total is 0 but taxable and taxes exist
        if (total <= 0.0 && (taxable > 0.0 || taxSum > 0.0)) {
            total = round2(taxable + taxSum);
            res.setTotalAmount(total);
        }

        // If taxable is 0 but total and taxes exist
        if (taxable <= 0.0 && total > 0.0 && taxSum > 0.0) {
            taxable = round2(total - taxSum);
            res.setTaxableAmount(taxable);
        }

        // If rate is 0 but taxes and taxable exist
        if (rate <= 0.0 && taxable > 0.0 && taxSum > 0.0) {
            double computedRate = Math.round((taxSum / taxable) * 100.0);
            if (List.of(5.0, 12.0, 18.0, 28.0).contains(computedRate)) {
                res.setGstRate(computedRate);
            }
        }
    }

    private boolean checkArithmetic(VlmExtractionResult res) {
        if (res == null) return false;
        double taxable = res.getTaxableAmount() != null ? res.getTaxableAmount() : 0.0;
        double cgst = res.getCgst() != null ? res.getCgst() : 0.0;
        double sgst = res.getSgst() != null ? res.getSgst() : 0.0;
        double igst = res.getIgst() != null ? res.getIgst() : 0.0;
        double total = res.getTotalAmount() != null ? res.getTotalAmount() : 0.0;

        if (taxable <= 0.0 || total <= 0.0) return false;

        double expected = taxable + cgst + sgst + igst;
        return Math.abs(expected - total) <= (total * 0.03 + 2.0);
    }

    private String sanitizeBase64(String input) {
        if (input == null) return "";
        String s = input.trim();
        if (s.contains(",")) {
            s = s.substring(s.indexOf(",") + 1);
        }
        return s.replaceAll("\\s+", "");
    }

    private String cleanString(String val) {
        if (val == null) return "";
        return val.trim().replaceAll("^[\\\"']+|[\\\"']+$", "");
    }

    private String cleanGstin(String val) {
        if (val == null) return "";
        String clean = val.toUpperCase().replaceAll("[^0-9A-Z]", "");
        Pattern pattern = Pattern.compile("[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}");
        Matcher matcher = pattern.matcher(clean);
        if (matcher.find()) {
            return matcher.group();
        }
        return clean.length() == 15 ? clean : (clean.isEmpty() ? "" : clean);
    }

    private String normalizeDate(String val) {
        if (val == null || val.isBlank()) return "";
        String s = val.trim();

        // ISO format YYYY-MM-DD
        if (s.matches("^\\d{4}-\\d{2}-\\d{2}$")) {
            return s;
        }

        // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
        Matcher dmy = Pattern.compile("^(\\d{1,2})[/.-](\\d{1,2})[/.-](\\d{4})$").matcher(s);
        if (dmy.matches()) {
            int d = Integer.parseInt(dmy.group(1));
            int m = Integer.parseInt(dmy.group(2));
            int y = Integer.parseInt(dmy.group(3));
            return String.format("%04d-%02d-%02d", y, m, d);
        }

        try {
            LocalDate parsed = LocalDate.parse(s, DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.ENGLISH));
            return parsed.toString();
        } catch (Exception ignored) {
        }

        return s;
    }

    private double round2(double val) {
        return Math.round(val * 100.0) / 100.0;
    }
}
