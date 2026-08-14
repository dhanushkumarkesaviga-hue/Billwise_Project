package com.billwise.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class VlmExtractionRequest {

    @NotBlank(message = "imageBase64 is required")
    private String imageBase64;

    private String mimeType;
    private String fileName;
}
