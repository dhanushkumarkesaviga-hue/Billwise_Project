package com.billwise.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegisterRequest {

    @NotBlank(message = "username must not be blank")
    private String username;

    @Email(message = "email must be valid")
    @NotBlank(message = "email must not be blank")
    private String email;

    @NotBlank(message = "password must not be blank")
    @Size(min = 6, message = "password must be at least 6 characters")
    private String password;

    // "ADMIN" | "ACCOUNTANT" | "VIEWER". Optional - defaults to VIEWER in
    // the service layer if omitted, so self-registration can't silently
    // grant admin rights.
    private String role;
}
