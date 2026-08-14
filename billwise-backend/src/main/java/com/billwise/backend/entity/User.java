package com.billwise.backend.entity;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Document(collection = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    private String id;

    @NotBlank
    @Indexed(unique = true)
    private String username;

    @Email
    @Indexed(unique = true)
    private String email;

    // BCrypt hash, never the raw password.
    @NotBlank
    private String password;

    private String fullName;

    private String phone;

    private Role role = Role.VIEWER;

    private String merchantId; // Linked tenant merchant, null for SUPER_ADMIN

    private String profilePhotoUrl;

    private boolean enabled = true;

    private Map<String, Object> notificationPreferences = new HashMap<>();

    private String themePreference = "light";

    private String resetOtp;
    private Instant resetOtpExpiresAt;

    private Instant createdAt = Instant.now();

    private Instant updatedAt = Instant.now();
}
