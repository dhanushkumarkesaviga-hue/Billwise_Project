package com.billwise.gst.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Encapsulates the complete result of the GSTR-3B ITC Set-off Waterfall under Rule 88A.
 * Contains the net cash liability payable per tax head, remaining unutilized ITC balances,
 * and the granular offset utilization audit breakdown.
 */
@Getter
@Builder
public class TaxOffsetResult {

    // Initial Liabilities
    private final BigDecimal initialOutputIgst;
    private final BigDecimal initialOutputCgst;
    private final BigDecimal initialOutputSgst;

    // Initial Available ITC
    private final BigDecimal initialItcIgst;
    private final BigDecimal initialItcCgst;
    private final BigDecimal initialItcSgst;

    // Offsets Utilized Breakdown
    private final BigDecimal igstOffsetByIgst;
    private final BigDecimal cgstOffsetByIgst;
    private final BigDecimal sgstOffsetByIgst;
    private final BigDecimal cgstOffsetByCgst;
    private final BigDecimal sgstOffsetBySgst;

    // Net Cash Liability Payable (Cash Ledger requirement)
    private final BigDecimal netCashIgst;
    private final BigDecimal netCashCgst;
    private final BigDecimal netCashSgst;
    private final BigDecimal totalCashPayable;

    // Remaining ITC Carried Forward (Electronic Credit Ledger)
    private final BigDecimal remainingItcIgst;
    private final BigDecimal remainingItcCgst;
    private final BigDecimal remainingItcSgst;
    private final BigDecimal totalRemainingItc;

    public TaxOffsetResult(
            BigDecimal initialOutputIgst,
            BigDecimal initialOutputCgst,
            BigDecimal initialOutputSgst,
            BigDecimal initialItcIgst,
            BigDecimal initialItcCgst,
            BigDecimal initialItcSgst,
            BigDecimal igstOffsetByIgst,
            BigDecimal cgstOffsetByIgst,
            BigDecimal sgstOffsetByIgst,
            BigDecimal cgstOffsetByCgst,
            BigDecimal sgstOffsetBySgst,
            BigDecimal netCashIgst,
            BigDecimal netCashCgst,
            BigDecimal netCashSgst,
            BigDecimal totalCashPayable,
            BigDecimal remainingItcIgst,
            BigDecimal remainingItcCgst,
            BigDecimal remainingItcSgst,
            BigDecimal totalRemainingItc
    ) {
        this.initialOutputIgst = initialOutputIgst;
        this.initialOutputCgst = initialOutputCgst;
        this.initialOutputSgst = initialOutputSgst;
        this.initialItcIgst = initialItcIgst;
        this.initialItcCgst = initialItcCgst;
        this.initialItcSgst = initialItcSgst;
        this.igstOffsetByIgst = igstOffsetByIgst;
        this.cgstOffsetByIgst = cgstOffsetByIgst;
        this.sgstOffsetByIgst = sgstOffsetByIgst;
        this.cgstOffsetByCgst = cgstOffsetByCgst;
        this.sgstOffsetBySgst = sgstOffsetBySgst;
        this.netCashIgst = netCashIgst;
        this.netCashCgst = netCashCgst;
        this.netCashSgst = netCashSgst;
        this.totalCashPayable = totalCashPayable;
        this.remainingItcIgst = remainingItcIgst;
        this.remainingItcCgst = remainingItcCgst;
        this.remainingItcSgst = remainingItcSgst;
        this.totalRemainingItc = totalRemainingItc;
    }
}
