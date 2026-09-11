package com.billwise.backend.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class ClassifyResponse {
    private String category;
    private Double confidence;
    private String reason;
    private boolean fallbackUsed;

    public ClassifyResponse(String category, Double confidence, String reason, boolean fallbackUsed) {
        this.category = category;
        this.confidence = confidence;
        this.reason = reason;
        this.fallbackUsed = fallbackUsed;
    }

    public ClassifyResponse(String category, boolean fallbackUsed) {
        this.category = category;
        this.confidence = fallbackUsed ? 0.50 : 0.85;
        this.reason = fallbackUsed ? "Fallback category assigned." : "Classified by BillWise ML Model.";
        this.fallbackUsed = fallbackUsed;
    }

    public ClassifyResponse(String category, Double confidence, String reason) {
        this.category = category;
        this.confidence = confidence;
        this.reason = reason;
        this.fallbackUsed = false;
    }
}


