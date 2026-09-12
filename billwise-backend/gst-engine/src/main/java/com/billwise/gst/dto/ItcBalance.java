package com.billwise.gst.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Encapsulates Available Input Tax Credit (ITC) balances for a tax period.
 */
@Getter
@Builder
public class ItcBalance {

    private final BigDecimal igst;
    private final BigDecimal cgst;
    private final BigDecimal sgst;

    public ItcBalance(BigDecimal igst, BigDecimal cgst, BigDecimal sgst) {
        this.igst = normalize(igst);
        this.cgst = normalize(cgst);
        this.sgst = normalize(sgst);
        validateNonNegative();
    }

    public BigDecimal getTotalItc() {
        return igst.add(cgst).add(sgst);
    }

    private static BigDecimal normalize(BigDecimal value) {
        return value != null ? value.setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    private void validateNonNegative() {
        if (igst.compareTo(BigDecimal.ZERO) < 0 || cgst.compareTo(BigDecimal.ZERO) < 0 || sgst.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("ITC balance amounts cannot be negative");
        }
    }
}
