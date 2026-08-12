package com.billwise.auth.entity;

import com.billwise.common.entity.Role;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

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

    @NotBlank
    @Email
    @Indexed(unique = true)
    private String email;

    @NotBlank
    @JsonIgnore
    private String password;

    private String fullName;

    private String phone;

    private String profilePhotoUrl;

    @NotNull
    private Role role;

    @Indexed
    private String merchantId;

    private boolean enabled = true;

    private boolean emailVerified = false;

    private boolean accountantVerified = true;

    private String verifiedByAdmin;

    private Instant accountantVerifiedAt;

    private String googleId;

    private String authProvider = "LOCAL";

    private String resetOtp;

    private Instant resetOtpExpiresAt;

    private UserSettings settings = new UserSettings();

    private Instant createdAt = Instant.now();

    private Instant updatedAt = Instant.now();
}
