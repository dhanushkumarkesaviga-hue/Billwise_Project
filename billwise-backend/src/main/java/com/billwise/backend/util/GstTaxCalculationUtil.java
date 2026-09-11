package com.billwise.backend.util;

import java.math.BigDecimal;
import java.math.RoundingMode;

public class GstTaxCalculationUtil {

    public static class TaxBreakdown {
        private final BigDecimal taxableAmount;
        private final Double gstRate;
        private final BigDecimal cgst;
        private final BigDecimal sgst;
        private final BigDecimal igst;
        private final BigDecimal totalAmount;
        private final boolean isInterstate;

        public TaxBreakdown(BigDecimal taxableAmount, Double gstRate, BigDecimal cgst, BigDecimal sgst, BigDecimal igst, BigDecimal totalAmount, boolean isInterstate) {
            this.taxableAmount = taxableAmount;
            this.gstRate = gstRate;
            this.cgst = cgst;
            this.sgst = sgst;
            this.igst = igst;
            this.totalAmount = totalAmount;
            this.isInterstate = isInterstate;
        }

        public BigDecimal getTaxableAmount() { return taxableAmount; }
        public Double getGstRate() { return gstRate; }
        public BigDecimal getCgst() { return cgst; }
        public BigDecimal getSgst() { return sgst; }
        public BigDecimal getIgst() { return igst; }
        public BigDecimal getTotalAmount() { return totalAmount; }
        public BigDecimal getTotalTax() { return cgst.add(sgst).add(igst); }
        public boolean isInterstate() { return isInterstate; }
    }

    public static TaxBreakdown calculateTaxes(BigDecimal taxableAmount, Double gstRate, String supplierStateCode, String recipientStateCode, String supplyType) {
        BigDecimal base = (taxableAmount != null) ? taxableAmount.setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        double rate = (gstRate != null) ? gstRate : 0.0;

        String suppState = cleanStateCode(supplierStateCode);
        String recipState = cleanStateCode(recipientStateCode);

        if ("EXPORT".equalsIgnoreCase(supplyType) || "SEZ".equalsIgnoreCase(supplyType)) {
            return new TaxBreakdown(
                    base,
                    rate,
                    BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
                    BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
                    BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
                    base,
                    true
            );
        }

        boolean isInterstate = false;
        if (!suppState.isEmpty() && !recipState.isEmpty()) {
            isInterstate = !suppState.equalsIgnoreCase(recipState);
        }

        BigDecimal rateBd = BigDecimal.valueOf(rate);
        BigDecimal hundred = BigDecimal.valueOf(100);

        BigDecimal cgst = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal sgst = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal igst = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        if (isInterstate) {
            igst = base.multiply(rateBd).divide(hundred, 2, RoundingMode.HALF_UP);
        } else {
            BigDecimal halfRate = rateBd.divide(BigDecimal.valueOf(2), 4, RoundingMode.HALF_UP);
            cgst = base.multiply(halfRate).divide(hundred, 2, RoundingMode.HALF_UP);
            sgst = base.multiply(halfRate).divide(hundred, 2, RoundingMode.HALF_UP);
        }

        BigDecimal totalAmount = base.add(cgst).add(sgst).add(igst);

        return new TaxBreakdown(base, rate, cgst, sgst, igst, totalAmount, isInterstate);
    }

    private static String cleanStateCode(String input) {
        if (input == null) return "";
        String trimmed = input.trim();
        if (trimmed.length() >= 2 && Character.isDigit(trimmed.charAt(0)) && Character.isDigit(trimmed.charAt(1))) {
            return trimmed.substring(0, 2);
        }
        return trimmed;
    }
}
