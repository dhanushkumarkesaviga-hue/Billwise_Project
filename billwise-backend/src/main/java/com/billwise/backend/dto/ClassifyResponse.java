package com.billwise.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class ClassifyResponse {
    private String category;
    // true if Gemini's answer had to be corrected to the nearest allowed
    // category (or fell back to "Other") because it didn't match exactly.
    private boolean fallbackUsed;
}
