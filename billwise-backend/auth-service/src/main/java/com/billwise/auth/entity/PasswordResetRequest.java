package com.billwise.auth.entity;

import com.billwise.common.entity.Role;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "password_reset_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PasswordResetRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "user_id")
    private String userId;

    private String username;

    private String email;

    private String fullName;

    private String phone;

    @Enumerated(EnumType.STRING)
    private Role role;

    @Column(name = "merchant_id")
    private String merchantId;

    private String adminUsername;

    private String requestedNewPassword; // BCrypt encoded

    private String status = "PENDING"; // PENDING, APPROVED, REJECTED

    @Column(length = 1000)
    private String reason;

    @Column(length = 1000)
    private String adminNote;

    private String reviewedByAdmin;

    private Instant createdAt = Instant.now();

    private Instant reviewedAt;
}
