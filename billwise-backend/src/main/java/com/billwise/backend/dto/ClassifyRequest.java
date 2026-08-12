package com.billwise.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ClassifyRequest {

    @NotBlank(message = "ocrText must not be blank")
    private String ocrText;

    // Optional extra hints that improve accuracy when available
    // (e.g. vendor name already parsed by regex before this call runs).
    private String vendorNameHint;
}
