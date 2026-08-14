package com.billwise.invoice.service;

import com.billwise.common.util.GstValidationUtil;
import com.billwise.invoice.dto.InvoiceDtos.LineItem;
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
                Analyze the provided invoice/bill image and extract all financial, legal, and itemized data.

                STEP 1 — Identify the document type:
                - "tax_invoice": standard GST tax invoice with itemized tax
                - "bill_of_supply": composition-scheme dealer or exempt supply, no GST charged (0% tax)
                - "reverse_charge": RCM invoice, tax payable by recipient
                - "export_zero_rated": export or LUT invoice, zero-rated supply
                - "unclear": cannot confidently determine

                STEP 2 — Extract every line item as a separate array entry in "lineItems", each with its
                own HSN/SAC code, taxable value, and GST rate. Do NOT collapse multiple
                rates into one — Indian invoices frequently mix rates (e.g. 12% and 18%
                items on the same bill) and each line item's rate must be captured
                individually.

                STEP 3 — Return ONLY a valid, parseable JSON object matching this exact schema:
                {
                  "documentType": "tax_invoice",
                  "extractionConfidence": 0.95,
                  "vendorName": "Full legal or trade name of supplier/seller (top of invoice, NOT buyer)",
                  "gstin": "15-character Indian GSTIN of supplier (e.g. 27AAPFU0939F1ZV)",
                  "invoiceNumber": "Invoice or bill serial number",
                  "invoiceDate": "YYYY-MM-DD",
                  "hsnSac": "Primary HSN or SAC tariff code",
                  "lineItems": [
                    {
                      "description": "Item or service description",
                      "hsnSac": "HSN or SAC code",
                      "quantity": 1.0,
                      "unitPrice": 100.0,
                      "taxableValue": 100.0,
                      "gstRate": 18.0,
                      "cgst": 9.0,
                      "sgst": 9.0,
                      "igst": 0.0,
                      "totalAmount": 118.0
                    }
                  ],
                  "taxableAmount": 0.0,
                  "gstRate": 0.0,
                  "cgst": 0.0,
                  "sgst": 0.0,
                  "igst": 0.0,
                  "totalAmount": 0.0
                }

                Rules:
                1. extractionConfidence: Provide your own 0.0 to 1.0 self-assessment of how legible, clear, and certain this extraction is (e.g., clear digital print = 0.95, crumpled/blurry/thermal receipt = 0.65, handwritten = 0.40).
                2. If documentType is "bill_of_supply", all GST amounts and rates should be 0.0 — this is expected and correct, not a missed extraction.
                3. If text is in a regional Indian language (Tamil, Hindi, Marathi, Telugu, etc.), still attempt extraction; assign lower extractionConfidence if uncertain.
                4. vendorName: Extract the supplier/seller company name at the top or header of the bill (never the customer/buyer/billed-to entity).
                5. Dates: Strictly ISO format YYYY-MM-DD.
                6. lineItems: Capture all rows from the invoice items table. If quantity or unitPrice are not specified, use 1.0 and taxableValue.
                7. Return strictly 0.0 for unknown numeric fields and "" for unknown text fields.
                8. DO NOT include markdown formatting, explanations, or notes. Return valid JSON only.
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
                "num_predict", 2048
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
            
            String cleanedGstin = cleanGstin(getNodeText(root, "gstin", "vendorGstin", "supplierGstin", "gst_number"));
            result.setGstin(cleanedGstin);
            result.setIsGstinValid(GstValidationUtil.isValidGstin(cleanedGstin));

            result.setInvoiceNumber(cleanString(getNodeText(root, "invoiceNumber", "invoice_number", "billNumber", "invNo")));
            result.setInvoiceDate(normalizeDate(getNodeText(root, "invoiceDate", "invoice_date", "date", "billDate")));
            result.setHsnSac(cleanString(getNodeText(root, "hsnSac", "hsn_sac", "hsnCode", "sacCode")));

            // Document Type
            String docTypeRaw = getNodeText(root, "documentType", "document_type", "docType", "invoiceType");
            String docType = sanitizeDocumentType(docTypeRaw);
            result.setDocumentType(docType);

            // Extraction Confidence
            Double confidence = parseNumeric(root, "extractionConfidence", "extraction_confidence", "confidence", "confidenceScore");
            if (confidence == null || confidence <= 0.0 || confidence > 1.0) {
                boolean hasEssentialFields = result.getVendorName() != null && !result.getVendorName().isBlank() 
                        && result.getGstin() != null && !result.getGstin().isBlank();
                confidence = hasEssentialFields ? 0.90 : 0.65;
            }
            result.setExtractionConfidence(round2(confidence));

            // Line items extraction
            List<LineItem> lineItems = parseLineItems(root);
            result.setLineItems(lineItems);

            // Server-side Roll-up: Compute authoritative totals from line items if available
            if (lineItems != null && !lineItems.isEmpty()) {
                double taxableSum = 0.0;
                double cgstSum = 0.0;
                double sgstSum = 0.0;
                double igstSum = 0.0;
                double totalSum = 0.0;
                Set<Double> distinctRates = new LinkedHashSet<>();

                for (LineItem item : lineItems) {
                    double itemTaxable = item.getTaxableValue() != null ? item.getTaxableValue() : 0.0;
                    double itemCgst = item.getCgst() != null ? item.getCgst() : 0.0;
                    double itemSgst = item.getSgst() != null ? item.getSgst() : 0.0;
                    double itemIgst = item.getIgst() != null ? item.getIgst() : 0.0;
                    double itemTotal = item.getTotalAmount() != null && item.getTotalAmount() > 0 
                            ? item.getTotalAmount() 
                            : (itemTaxable + itemCgst + itemSgst + itemIgst);

                    taxableSum += itemTaxable;
                    cgstSum += itemCgst;
                    sgstSum += itemSgst;
                    igstSum += itemIgst;
                    totalSum += itemTotal;

                    if (item.getGstRate() != null && item.getGstRate() > 0) {
                        distinctRates.add(item.getGstRate());
                    }
                }

                taxableSum = round2(taxableSum);
                cgstSum = round2(cgstSum);
                sgstSum = round2(sgstSum);
                igstSum = round2(igstSum);
                totalSum = round2(totalSum);

                result.setTaxableAmount(taxableSum);

                if ("bill_of_supply".equalsIgnoreCase(docType)) {
                    result.setCgst(0.0);
                    result.setSgst(0.0);
                    result.setIgst(0.0);
                    result.setGstRate(0.0);
                    result.setTotalAmount(taxableSum > 0 ? taxableSum : totalSum);
                } else {
                    result.setCgst(cgstSum);
                    result.setSgst(sgstSum);
                    result.setIgst(igstSum);
                    result.setTotalAmount(totalSum);

                    if (distinctRates.size() == 1) {
                        result.setGstRate(distinctRates.iterator().next());
                    } else if (distinctRates.size() > 1) {
                        double totalTax = cgstSum + sgstSum + igstSum;
                        if (taxableSum > 0) {
                            double effectiveRate = round2((totalTax / taxableSum) * 100.0);
                            result.setGstRate(effectiveRate);
                        } else {
                            result.setGstRate(distinctRates.iterator().next());
                        }
                    } else {
                        result.setGstRate(0.0);
                    }
                }
            } else {
                // Fallback for flat JSON schema if no line items parsed
                result.setTaxableAmount(parseNumeric(root, "taxableAmount", "taxable_amount", "taxableValue", "subtotal", "subTotal"));
                result.setGstRate(parseNumeric(root, "gstRate", "gst_rate", "rate", "taxRate"));
                result.setCgst(parseNumeric(root, "cgst", "cgstAmount", "cgst_amount"));
                result.setSgst(parseNumeric(root, "sgst", "sgstAmount", "sgst_amount"));
                result.setIgst(parseNumeric(root, "igst", "igstAmount", "igst_amount"));
                result.setTotalAmount(parseNumeric(root, "totalAmount", "total_amount", "grandTotal", "invoiceTotal", "total"));

                if ("bill_of_supply".equalsIgnoreCase(docType)) {
                    result.setCgst(0.0);
                    result.setSgst(0.0);
                    result.setIgst(0.0);
                    result.setGstRate(0.0);
                    if (result.getTotalAmount() <= 0.0 && result.getTaxableAmount() > 0.0) {
                        result.setTotalAmount(result.getTaxableAmount());
                    }
                } else {
                    reconcileInternalFinancials(result);
                }
            }

            return result;
        } catch (Exception e) {
            log.warn("Failed to parse JSON node from vision response: {}. Raw was: {}", e.getMessage(), rawText);
            return null;
        }
    }

    private List<LineItem> parseLineItems(JsonNode root) {
        if (root == null) return new ArrayList<>();
        JsonNode itemsNode = null;
        for (String field : List.of("lineItems", "line_items", "items", "invoiceItems", "itemList")) {
            if (root.has(field) && root.get(field).isArray()) {
                itemsNode = root.get(field);
                break;
            }
        }
        if (itemsNode == null || !itemsNode.isArray() || itemsNode.isEmpty()) {
            return new ArrayList<>();
        }

        List<LineItem> items = new ArrayList<>();
        for (JsonNode itemNode : itemsNode) {
            LineItem item = new LineItem();
            item.setDescription(cleanString(getNodeText(itemNode, "description", "itemDescription", "name", "itemName", "particulars", "productName")));
            item.setHsnSac(cleanString(getNodeText(itemNode, "hsnSac", "hsn_sac", "hsnCode", "sacCode", "hsn")));

            Double qty = parseNumeric(itemNode, "quantity", "qty", "count");
            item.setQuantity(qty != null && qty > 0 ? qty : 1.0);

            Double unitPrice = parseNumeric(itemNode, "unitPrice", "unit_price", "price", "rate");
            Double taxable = parseNumeric(itemNode, "taxableValue", "taxable_value", "taxableAmount", "amount", "taxable");

            if (taxable <= 0.0 && unitPrice > 0.0 && qty != null && qty > 0) {
                taxable = round2(unitPrice * qty);
            }
            if (unitPrice <= 0.0 && taxable > 0.0 && qty != null && qty > 0) {
                unitPrice = round2(taxable / qty);
            }

            item.setUnitPrice(unitPrice);
            item.setTaxableValue(taxable);

            Double gstRate = parseNumeric(itemNode, "gstRate", "gst_rate", "rate", "taxRate");
            item.setGstRate(gstRate != null ? gstRate : 0.0);

            Double cgst = parseNumeric(itemNode, "cgst", "cgstAmount", "cgst_amount");
            Double sgst = parseNumeric(itemNode, "sgst", "sgstAmount", "sgst_amount");
            Double igst = parseNumeric(itemNode, "igst", "igstAmount", "igst_amount");

            // Calculate per-line tax if missing but rate & taxable are present
            if (cgst <= 0.0 && sgst <= 0.0 && igst <= 0.0 && gstRate != null && gstRate > 0.0 && taxable > 0.0) {
                double totalTax = round2((taxable * gstRate) / 100.0);
                cgst = round2(totalTax / 2.0);
                sgst = round2(totalTax / 2.0);
                igst = 0.0;
            }

            item.setCgst(cgst);
            item.setSgst(sgst);
            item.setIgst(igst);

            Double total = parseNumeric(itemNode, "totalAmount", "total_amount", "total", "itemTotal");
            if (total <= 0.0) {
                total = round2(taxable + cgst + sgst + igst);
            }
            item.setTotalAmount(total);

            if (!item.getDescription().isEmpty() || item.getTaxableValue() > 0.0) {
                items.add(item);
            }
        }
        return items;
    }

    private String sanitizeDocumentType(String type) {
        if (type == null || type.isBlank()) return "tax_invoice";
        String clean = type.trim().toLowerCase().replaceAll("[\\s-]+", "_");
        if (clean.contains("bill_of_supply") || clean.contains("composition") || clean.contains("exempt")) {
            return "bill_of_supply";
        }
        if (clean.contains("reverse_charge") || clean.contains("rcm")) {
            return "reverse_charge";
        }
        if (clean.contains("export") || clean.contains("zero_rated") || clean.contains("lut")) {
            return "export_zero_rated";
        }
        if (clean.contains("unclear") || clean.contains("unknown")) {
            return "unclear";
        }
        return "tax_invoice";
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

        if ("bill_of_supply".equalsIgnoreCase(res.getDocumentType())) {
            double taxable = res.getTaxableAmount() != null ? res.getTaxableAmount() : 0.0;
            double total = res.getTotalAmount() != null ? res.getTotalAmount() : 0.0;
            if (taxable <= 0.0 && total <= 0.0) return false;
            if (taxable > 0.0 && total > 0.0) {
                return Math.abs(taxable - total) <= (total * 0.02 + 1.0);
            }
            return true;
        }

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

