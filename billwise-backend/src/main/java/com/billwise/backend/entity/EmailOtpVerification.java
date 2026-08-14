package com.billwise.backend.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "email_otp_verifications")
@CompoundIndex(name = "email_purpose_idx", def = "{'email': 1, 'purpose': 1}")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class EmailOtpVerification {

    @Id
    private String id;

    @Indexed
    private String email;

    private String otpHash;

    private String purpose = "ADMIN_SIGNUP_VERIFICATION";

    private Instant expiresAt;

    private int attemptCount = 0;

    private int maxAttempts = 5;

    private boolean verified = false;

    private boolean used = false;

    private Instant createdAt = Instant.now();

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
