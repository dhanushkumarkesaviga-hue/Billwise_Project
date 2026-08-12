package com.billwise.invoice.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "invoice_deletion_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceDeletionRequest {

    @Id
    private String id;

    @Indexed
    private String invoiceId;

    private String invoiceNumber;

    private String vendorName;

    private java.math.BigDecimal totalAmount;

    private String category;

    @Indexed
    private String merchantId;

    @Indexed
    private String requestedByUsername;

    private String requestedByName;

    private String requesterRole = "ACCOUNTANT";

    private String reason;

    @Indexed
    private String status = "PENDING"; // PENDING, APPROVED, REJECTED

    private String reviewedBy;

    private String reviewRemarks;

    private Instant createdAt = Instant.now();

    private Instant reviewedAt;
}
