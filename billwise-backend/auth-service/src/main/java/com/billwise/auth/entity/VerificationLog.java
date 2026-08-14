package com.billwise.auth.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "verification_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class VerificationLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "merchant_id")
    private String merchantId;

    private String action; // APPROVED, REJECTED, SUSPENDED, RESUBMITTED

    private String performedBy; // username of SuperAdmin or Merchant Admin

    @Column(length = 1000)
    private String reason;

    private Instant timestamp = Instant.now();
}
