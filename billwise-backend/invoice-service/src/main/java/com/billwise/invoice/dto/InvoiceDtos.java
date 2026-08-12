package com.billwise.invoice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

public class InvoiceDtos {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClassifyRequest {
        @NotBlank(message = "ocrText is required")
        private String ocrText;

        private String vendorNameHint;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClassifyResponse {
        private String category;
        private Double confidence;
        private String reason;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChatRequest {
        @NotBlank(message = "Message cannot be empty")
        private String message;

        private String sessionId;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChatResponse {
        private String reply;
        private String sessionId;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VlmExtractionRequest {
        @NotBlank(message = "imageBase64 is required")
        private String imageBase64;

        private String mimeType;
        private String fileName;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VlmExtractionResult {
        private String vendorName;
        private String gstin;
        private String invoiceNumber;
        private String invoiceDate;
        private String hsnSac;
        private Double taxableAmount;
        private Double gstRate;
        private Double cgst;
        private Double sgst;
        private Double igst;
        private Double totalAmount;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VlmExtractionResponse {
        private boolean success;
        private String modelUsed;
        private VlmExtractionResult data;
        private String rawReply;
        private String error;
        private Boolean isArithmeticValid;
    }
}
