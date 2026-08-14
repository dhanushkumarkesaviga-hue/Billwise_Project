package com.billwise.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class VlmExtractionResponse {
    private boolean success;
    private String modelUsed;
    private VlmExtractionResult data;
    private String rawReply;
    private String error;
    private Boolean isArithmeticValid;
}
