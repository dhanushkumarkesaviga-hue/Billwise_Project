package com.billwise.invoice.service;

import com.billwise.invoice.dto.InvoiceDtos.ClassifyResponse;
import com.billwise.invoice.entity.InvoiceCategories;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
public class InvoiceClassificationService {

    private final RestTemplate restTemplate;
    private final String mlClassifyUrl;

    public InvoiceClassificationService(
            RestTemplateBuilder restTemplateBuilder,
            @Value("${ml.classify.url:http://localhost:8000/classify}") String mlClassifyUrl,
            @Value("${ml.classify.timeout-ms:3000}") long timeoutMs) {
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofMillis(timeoutMs))
                .setReadTimeout(Duration.ofMillis(timeoutMs))
                .build();
        this.mlClassifyUrl = (mlClassifyUrl != null && !mlClassifyUrl.isBlank())
                ? mlClassifyUrl.trim()
                : "http://localhost:8000/classify";
    }

    /**
     * Classifies the given OCR invoice text and vendor hint into one of the 15 allowed categories
     * using the custom trained Machine Learning microservice.
     */
    public ClassifyResponse classify(String ocrText, String vendorNameHint) {
        if (ocrText == null || ocrText.isBlank()) {
            return new ClassifyResponse(InvoiceCategories.DEFAULT_CATEGORY, 0.5, "No OCR text provided.");
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("text", ocrText);
            if (vendorNameHint != null && !vendorNameHint.isBlank()) {
                requestBody.put("vendorNameHint", vendorNameHint.trim());
            }

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            Map<?, ?> response = restTemplate.postForObject(mlClassifyUrl, entity, Map.class);

            if (response != null && response.containsKey("category")) {
                String category = String.valueOf(response.get("category"));
                Double confidence = 0.85;
                if (response.get("confidence") instanceof Number num) {
                    confidence = num.doubleValue();
                }
                String reason = response.containsKey("reason")
                        ? String.valueOf(response.get("reason"))
                        : "Classified by BillWise ML Model.";

                // Safety validation: verify that the returned category strictly exists in the 15 taxonomy categories
                if (InvoiceCategories.isValid(category)) {
                    log.info("ML Category Classifier predicted [{}] with confidence [{}]", category, confidence);
                    return new ClassifyResponse(category, confidence, reason);
                } else {
                    log.warn("ML Classifier returned unrecognized category [{}]. Falling back to '{}'", category, InvoiceCategories.DEFAULT_CATEGORY);
                    return new ClassifyResponse(InvoiceCategories.DEFAULT_CATEGORY, 0.50, "Unrecognized category returned by ML model; defaulted to Other.");
                }
            }
        } catch (Exception ex) {
            log.warn("ML inference service request to [{}] failed: {}. Falling back to rule-based heuristic classifier.", mlClassifyUrl, ex.getMessage());
        }

        // Secondary fallback to heuristic rule-based classification if ML service is unreachable
        return heuristicClassify(ocrText, vendorNameHint, "ML service unreachable; used rule-based classifier fallback.");
    }

    private ClassifyResponse heuristicClassify(String text, String vendor, String reasonPrefix) {
        String haystack = ((vendor == null ? "" : vendor) + " " + text).toLowerCase();

        if (haystack.contains("smartphone") || haystack.contains("mobile") || haystack.contains("phone")
                || haystack.contains("handset") || haystack.contains("cellular") || haystack.contains("8517")
                || haystack.contains("laptop") || haystack.contains("computer") || haystack.contains("server hardware")
                || haystack.contains("chair") || haystack.contains("furniture") || haystack.contains("desk")
                || haystack.contains("asset") || haystack.contains("machinery")) {
            return new ClassifyResponse("Capital Goods & Office Assets", 0.92, reasonPrefix + " (Matched electronics/telecom/assets)");
        }
        if (haystack.contains("cloud") || haystack.contains("aws") || haystack.contains("azure")
                || haystack.contains("hosting") || haystack.contains("server") || haystack.contains("digitalocean")) {
            return new ClassifyResponse("Cloud Infrastructure", 0.90, reasonPrefix + " (Matched cloud keywords)");
        }
        if (haystack.contains("software") || haystack.contains("subscription") || haystack.contains("saas")
                || haystack.contains("license") || haystack.contains("github") || haystack.contains("atlassian") || haystack.contains("jira")) {
            return new ClassifyResponse("Software & Subscriptions", 0.88, reasonPrefix + " (Matched software keywords)");
        }
        if (haystack.contains("freight") || haystack.contains("transport") || haystack.contains("logistics")
                || haystack.contains("courier") || haystack.contains("cargo") || haystack.contains("shipping charges")
                || haystack.contains("goods carriage") || haystack.contains("lorry")) {
            return new ClassifyResponse("Freight & Transport", 0.90, reasonPrefix + " (Matched freight/transport)");
        }
        if (haystack.contains("hotel") || haystack.contains("restaurant") || haystack.contains("catering")
                || haystack.contains("food") || haystack.contains("dining") || haystack.contains("cafe") || haystack.contains("buffet")) {
            return new ClassifyResponse("Food & Entertainment", 0.92, reasonPrefix + " (Matched food/catering)");
        }
        if (haystack.contains("steel") || haystack.contains("raw") || haystack.contains("material")
                || haystack.contains("hardware") || haystack.contains("fastener") || haystack.contains("chemical") || haystack.contains("polymer")
                || haystack.contains("compound")) {
            return new ClassifyResponse("Raw Materials", 0.85, reasonPrefix + " (Matched raw materials)");
        }
        if (haystack.contains("legal") || haystack.contains("consulting") || haystack.contains("advocate")
                || haystack.contains("audit") || haystack.contains("chartered") || haystack.contains("professional")) {
            return new ClassifyResponse("Professional & Legal Services", 0.87, reasonPrefix + " (Matched professional services)");
        }
        if (haystack.contains("electricity") || haystack.contains("water") || haystack.contains("broadband")
                || haystack.contains("internet") || haystack.contains("gas") || haystack.contains("utility")) {
            return new ClassifyResponse("Utilities", 0.86, reasonPrefix + " (Matched utilities)");
        }
        if (haystack.contains("rent") || haystack.contains("lease") || haystack.contains("coworking")
                || haystack.contains("premises") || haystack.contains("facilities")) {
            return new ClassifyResponse("Rent & Facilities", 0.88, reasonPrefix + " (Matched rent/facilities)");
        }
        if (haystack.contains("marketing") || haystack.contains("advertising") || haystack.contains("ads")
                || haystack.contains("campaign") || haystack.contains("billboard") || haystack.contains("seo")) {
            return new ClassifyResponse("Marketing & Advertising", 0.87, reasonPrefix + " (Matched marketing/advertising)");
        }
        if (haystack.contains("stationery") || haystack.contains("paper") || haystack.contains("pens")
                || haystack.contains("print") || haystack.contains("supplies")) {
            return new ClassifyResponse("Office Supplies & Stationery", 0.86, reasonPrefix + " (Matched office supplies)");
        }
        if (haystack.contains("insurance") || haystack.contains("premium") || haystack.contains("policy")
                || haystack.contains("indemnity") || haystack.contains("mediclaim")) {
            return new ClassifyResponse("Insurance", 0.89, reasonPrefix + " (Matched insurance)");
        }
        if (haystack.contains("travel") || haystack.contains("flight") || haystack.contains("air ticket")
                || haystack.contains("cab") || haystack.contains("taxi") || haystack.contains("conveyance")) {
            return new ClassifyResponse("Travel & Conveyance", 0.88, reasonPrefix + " (Matched travel)");
        }
        if (haystack.contains("repair") || haystack.contains("maintenance") || haystack.contains("amc")
                || haystack.contains("servicing")) {
            return new ClassifyResponse("Repairs & Maintenance", 0.87, reasonPrefix + " (Matched repairs)");
        }

        return new ClassifyResponse(InvoiceCategories.DEFAULT_CATEGORY, 0.50, reasonPrefix + " (Defaulted to Other)");
    }
}
