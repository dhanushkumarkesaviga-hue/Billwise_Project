package com.billwise.invoice.entity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Document(collection = "sales_invoices")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SalesInvoice {

    @Id
    private String id;

    // Multi-tenant isolation: links sales invoice to its owner merchant
    private String merchantId;

    @NotBlank(message = "Customer name is required")
    private String customerName;

    // Optional for B2C sales; required for B2B
    private String customerGstin;

    @NotBlank(message = "Invoice number is required")
    private String invoiceNumber;

    @NotNull(message = "Invoice date is required")
    @com.fasterxml.jackson.databind.annotation.JsonDeserialize(using = com.billwise.common.util.FlexibleLocalDateDeserializer.class)
    private LocalDate invoiceDate;

    @com.fasterxml.jackson.databind.annotation.JsonDeserialize(using = com.billwise.common.util.FlexibleLocalDateDeserializer.class)
    private LocalDate dueDate;

    private String hsnSac;

    @NotNull(message = "Taxable amount is required")
    private BigDecimal taxableAmount;

    private Double gstRate;

    private BigDecimal cgst = BigDecimal.ZERO;
    private BigDecimal sgst = BigDecimal.ZERO;
    private BigDecimal igst = BigDecimal.ZERO;

    @NotNull(message = "Total amount is required")
    private BigDecimal totalAmount;

    // "B2B" | "B2C" | "EXPORT" | "SEZ"
    private String supplyType = "B2B";

    // "Draft" | "Issued" | "Cancelled"
    private String status = "Issued";

    // 2-digit state code or state name (defaults to customer GSTIN state or merchant state)
    private String placeOfSupply;

    private String notes;

    // Username of creator
    private String createdBy;

    private Instant createdAt = Instant.now();
    private Instant updatedAt = Instant.now();
}
