package com.billwise.auth.entity;

import com.billwise.common.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "password_reset_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PasswordResetRequest {

    @Id
    private String id;

    @Indexed
    private String userId;

    @Indexed
    private String username;

    private String email;

    private String fullName;

    private String phone;

    private Role role;

    @Indexed
    private String merchantId;

    @Indexed
    private String adminUsername;

    private String requestedNewPassword; // BCrypt encoded

    private String status = "PENDING"; // PENDING, APPROVED, REJECTED

    private String reason;

    private String adminNote;

    private String reviewedByAdmin;

    private Instant createdAt = Instant.now();

    private Instant reviewedAt;
}
