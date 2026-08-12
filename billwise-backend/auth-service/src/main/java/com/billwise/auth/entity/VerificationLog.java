package com.billwise.auth.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
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

    @Indexed
    private String merchantId;

    private String action; // APPROVED, REJECTED, SUSPENDED, RESUBMITTED

    private String performedBy; // username of SuperAdmin or Merchant Admin

    private String reason;

    private Instant timestamp = Instant.now();
}
