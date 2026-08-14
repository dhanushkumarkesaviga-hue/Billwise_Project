package com.billwise.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class VlmExtractionResult {
    private String vendorName;
    private String gstin;
    private String invoiceNumber;
    private String invoiceDate;
    private String hsnSac;
    private String documentType; // "tax_invoice" | "bill_of_supply" | "reverse_charge" | "export_zero_rated" | "unclear"
    private Double extractionConfidence; // 0.0–1.0
    private List<LineItemDto> lineItems;
    private Double taxableAmount;
    private Double gstRate;
    private Double cgst;
    private Double sgst;
    private Double igst;
    private Double totalAmount;
    private Boolean isGstinValid;
}
