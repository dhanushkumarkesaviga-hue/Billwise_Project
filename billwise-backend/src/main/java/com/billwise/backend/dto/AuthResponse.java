package com.billwise.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class AuthResponse {
    private String token;
    private String username;
    private String email;
    private String role;
    private String fullName;
    private String merchantId;
    private String merchantStatus;
    private String merchantTradeName;
    private long expiresInMs;
}
