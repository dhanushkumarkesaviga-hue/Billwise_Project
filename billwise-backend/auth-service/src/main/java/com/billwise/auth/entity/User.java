package com.billwise.auth.entity;

import com.billwise.common.entity.Role;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @NotBlank
    @Column(unique = true, nullable = false)
    private String username;

    @NotBlank
    @Email
    @Column(unique = true, nullable = false)
    private String email;

    @NotBlank
    @JsonIgnore
    @Column(nullable = false)
    private String password;

    private String fullName;

    private String phone;

    @Lob
    @Column(name = "profile_photo_url", columnDefinition = "LONGTEXT")
    private String profilePhotoUrl;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(name = "merchant_id")
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

    @Embedded
    private UserSettings settings = new UserSettings();

    private Instant createdAt = Instant.now();

    private Instant updatedAt = Instant.now();
}
