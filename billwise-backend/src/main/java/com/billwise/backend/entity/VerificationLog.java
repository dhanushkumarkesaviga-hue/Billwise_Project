package com.billwise.backend.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "verification_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class VerificationLog {

    @Id
    private String id;

    private String merchantId;

    private String action; // APPROVED, REJECTED, RESUBMITTED, SUSPENDED

    private String performedBy; // Username of super admin or merchant admin

    private String reason; // Notes or rejection reason

    private Instant timestamp = Instant.now();
}
