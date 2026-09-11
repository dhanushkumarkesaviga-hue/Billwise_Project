package com.billwise.backend.entity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDate;

@Document(collection = "invoices")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Invoice {

    // Matches the frontend's "INV-2026-0891" style id
    @Id
    private String id;

    // Multi-tenant isolation: links invoice to its owner merchant
    private String merchantId;

    @NotBlank
    private String vendorName;

    @NotBlank
    private String gstin;

    private String invoiceNumber;

    @NotNull
    @com.fasterxml.jackson.databind.annotation.JsonDeserialize(using = com.billwise.backend.util.FlexibleLocalDateDeserializer.class)
    private LocalDate invoiceDate;

    @com.fasterxml.jackson.databind.annotation.JsonDeserialize(using = com.billwise.backend.util.FlexibleLocalDateDeserializer.class)
    private LocalDate dueDate;

    private String category;

    private String hsnSac;

    @NotNull
    private BigDecimal taxableAmount;

    private Double gstRate;

    private BigDecimal cgst = BigDecimal.ZERO;
    private BigDecimal sgst = BigDecimal.ZERO;
    private BigDecimal igst = BigDecimal.ZERO;

    @NotNull
    private BigDecimal totalAmount;

    // e.g. "Eligible", "Eligible (RCM)", "Ineligible (Sec 17(5))"
    private String itcEligibility;

    private BigDecimal itcAmount = BigDecimal.ZERO;

    private boolean rcmApplicable;

    // "Approved" | "Pending" | "Flagged"
    private String status = "Pending";

    // "Paid" | "Unpaid"
    private String paymentStatus = "Unpaid";

    private Double ocrConfidence;

    private String notes;

    private String rawFileUrl;

    private String rawOcrTextSnippet;

    // Username of the user who created this invoice
    private String createdBy;
}
