package com.billwise.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfileRequest {

    private String fullName;

    @Email(message = "Invalid email format")
    private String email;

    private String phone;

    private String profilePhotoUrl;
}
