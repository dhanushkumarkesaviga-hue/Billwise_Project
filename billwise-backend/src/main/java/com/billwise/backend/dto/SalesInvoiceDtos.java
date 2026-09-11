package com.billwise.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class SalesInvoiceDtos {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Gstr3bSummaryDto {
        private LocalDate fromDate;
        private LocalDate toDate;

        // Table 3.1: Outward taxable supplies
        private BigDecimal totalOutputTaxableAmount;
        private BigDecimal totalOutputCgst;
        private BigDecimal totalOutputSgst;
        private BigDecimal totalOutputIgst;
        private BigDecimal totalOutputTax;
        private long salesInvoiceCount;

        // Table 4(A): Eligible ITC
        private BigDecimal totalEligibleItcTaxableAmount;
        private BigDecimal totalEligibleCgst;
        private BigDecimal totalEligibleSgst;
        private BigDecimal totalEligibleIgst;
        private BigDecimal totalEligibleItc;
        private long eligiblePurchaseInvoiceCount;

        // Table 4(D): Ineligible ITC (Section 17(5))
        private BigDecimal totalIneligibleItc;
        private long ineligiblePurchaseInvoiceCount;

        // Netting & Settlement
        private BigDecimal netCgst;
        private BigDecimal netSgst;
        private BigDecimal netIgst;
        private BigDecimal netTaxLiability;

        // "PAYABLE" | "CARRY_FORWARD"
        private String liabilityType;
        private BigDecimal netPayableAmount;
        private BigDecimal carryForwardCreditAmount;
        private String statusMessage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class B2bSupplyItem {
        private String id;
        private String customerGstin;
        private String customerName;
        private String invoiceNumber;
        private LocalDate invoiceDate;
        private BigDecimal taxableAmount;
        private Double gstRate;
        private BigDecimal cgst;
        private BigDecimal sgst;
        private BigDecimal igst;
        private BigDecimal totalAmount;
        private String placeOfSupply;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class B2cLargeSupplyItem {
        private String id;
        private String customerName;
        private String invoiceNumber;
        private LocalDate invoiceDate;
        private BigDecimal taxableAmount;
        private Double gstRate;
        private BigDecimal igst;
        private BigDecimal totalAmount;
        private String placeOfSupply;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class B2cSmallSummaryItem {
        private String placeOfSupply;
        private String stateName;
        private Double gstRate;
        private BigDecimal totalTaxableAmount;
        private BigDecimal totalCgst;
        private BigDecimal totalSgst;
        private BigDecimal totalIgst;
        private BigDecimal totalTax;
        private long invoiceCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExportSupplyItem {
        private String id;
        private String customerName;
        private String invoiceNumber;
        private LocalDate invoiceDate;
        private BigDecimal taxableAmount;
        private Double gstRate;
        private BigDecimal totalAmount;
        private String supplyType;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HsnSummaryItem {
        private String hsnSac;
        private Double gstRate;
        private BigDecimal totalTaxableAmount;
        private BigDecimal totalCgst;
        private BigDecimal totalSgst;
        private BigDecimal totalIgst;
        private BigDecimal totalTax;
        private BigDecimal totalInvoiceAmount;
        private long lineCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Gstr1ReportDto {
        private LocalDate fromDate;
        private LocalDate toDate;

        @Builder.Default
        private List<B2bSupplyItem> b2bInvoices = new ArrayList<>();

        @Builder.Default
        private List<B2cLargeSupplyItem> b2cLargeInvoices = new ArrayList<>();

        @Builder.Default
        private List<B2cSmallSummaryItem> b2cSmallSummaries = new ArrayList<>();

        @Builder.Default
        private List<ExportSupplyItem> exportInvoices = new ArrayList<>();

        @Builder.Default
        private List<HsnSummaryItem> hsnSummaries = new ArrayList<>();

        private BigDecimal totalTaxableValue;
        private BigDecimal totalCgst;
        private BigDecimal totalSgst;
        private BigDecimal totalIgst;
        private BigDecimal totalOutputTax;
        private BigDecimal totalInvoiceValue;
        private long totalInvoicesCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SalesInvoiceStatsDto {
        private long totalSalesInvoices;
        private BigDecimal totalTaxableRevenue;
        private BigDecimal totalOutputTax;
        private BigDecimal totalSalesValue;
        private long b2bCount;
        private long b2cCount;
        private long exportCount;
        private long draftCount;
        private long issuedCount;
        private long cancelledCount;
    }
}
