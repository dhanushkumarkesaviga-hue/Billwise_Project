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
}
