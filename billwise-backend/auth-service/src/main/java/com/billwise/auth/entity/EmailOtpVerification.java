package com.billwise.auth.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "email_otp_verifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class EmailOtpVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String email;

    /**
     * Stored as a secure BCrypt hash, never plaintext
     */
    @Column(nullable = false)
    private String otpHash;

    /**
     * Purpose tag e.g. "ADMIN_SIGNUP_VERIFICATION", "PASSWORD_RESET"
     */
    private String purpose = "ADMIN_SIGNUP_VERIFICATION";

    /**
     * Expiration timestamp (10 minutes window)
     */
    private Instant expiresAt;

    /**
     * Failed verification attempts counter (max 5)
     */
    private int attemptCount = 0;

    private int maxAttempts = 5;

    /**
     * True once successfully verified
     */
    private boolean verified = false;

    /**
     * True once the verified OTP is consumed/used (prevents replay attacks)
     */
    private boolean used = false;

    private Instant createdAt = Instant.now();

    /**
     * Timestamp of the most recent OTP generation/send (for 60s rate limiting)
     */
    private Instant lastSentAt = Instant.now();

    public EmailOtpVerification(String email, String otpHash, String purpose, Instant expiresAt) {
        this.email = email;
        this.otpHash = otpHash;
        this.purpose = purpose != null ? purpose : "ADMIN_SIGNUP_VERIFICATION";
        this.expiresAt = expiresAt;
        this.attemptCount = 0;
        this.maxAttempts = 5;
        this.verified = false;
        this.used = false;
        this.createdAt = Instant.now();
        this.lastSentAt = Instant.now();
    }
}
