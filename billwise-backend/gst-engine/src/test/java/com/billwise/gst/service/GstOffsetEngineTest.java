package com.billwise.gst.service;

import com.billwise.gst.dto.ItcBalance;
import com.billwise.gst.dto.TaxLiability;
import com.billwise.gst.dto.TaxOffsetResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class GstOffsetEngineTest {

    private GstOffsetEngine offsetEngine;

    @BeforeEach
    void setUp() {
        offsetEngine = new GstOffsetEngine();
    }

    @Test
    @DisplayName("Full ITC set-off scenario: ITC exceeds liability resulting in zero cash payable")
    void testFullItcSetOffScenario() {
        TaxLiability liability = new TaxLiability(
                new BigDecimal("1000.00"), // IGST
                new BigDecimal("500.00"),  // CGST
                new BigDecimal("500.00")   // SGST
        );

        ItcBalance itc = new ItcBalance(
                new BigDecimal("2000.00"), // IGST ITC
                new BigDecimal("500.00"),  // CGST ITC
                new BigDecimal("500.00")   // SGST ITC
        );

        TaxOffsetResult result = offsetEngine.calculateOffset(liability, itc);

        // All output liabilities extinguished
        assertEquals(new BigDecimal("0.00"), result.getNetCashIgst());
        assertEquals(new BigDecimal("0.00"), result.getNetCashCgst());
        assertEquals(new BigDecimal("0.00"), result.getNetCashSgst());
        assertEquals(new BigDecimal("0.00"), result.getTotalCashPayable());

        // Offsets breakdown:
        // Step 1: IGST liability 1000 offset by IGST ITC 1000 (1000 remaining IGST ITC)
        assertEquals(new BigDecimal("1000.00"), result.getIgstOffsetByIgst());
        // Step 2: CGST liability 500 offset by remaining IGST ITC 500 (500 remaining IGST ITC)
        assertEquals(new BigDecimal("500.00"), result.getCgstOffsetByIgst());
        // Step 3: SGST liability 500 offset by remaining IGST ITC 500 (0 remaining IGST ITC)
        assertEquals(new BigDecimal("500.00"), result.getSgstOffsetByIgst());
        // Step 4 & 5: CGST and SGST outputs were already zero
        assertEquals(new BigDecimal("0.00"), result.getCgstOffsetByCgst());
        assertEquals(new BigDecimal("0.00"), result.getSgstOffsetBySgst());

        // Remaining ITC carried forward
        assertEquals(new BigDecimal("0.00"), result.getRemainingItcIgst());
        assertEquals(new BigDecimal("500.00"), result.getRemainingItcCgst());
        assertEquals(new BigDecimal("500.00"), result.getRemainingItcSgst());
        assertEquals(new BigDecimal("1000.00"), result.getTotalRemainingItc());
    }

    @Test
    @DisplayName("Partial ITC set-off scenario: Liabilities exceed ITC requiring net cash payment per head")
    void testPartialItcSetOffScenario() {
        TaxLiability liability = new TaxLiability(
                new BigDecimal("2000.00"), // IGST
                new BigDecimal("1000.00"), // CGST
                new BigDecimal("1000.00")  // SGST
        );

        ItcBalance itc = new ItcBalance(
                new BigDecimal("1200.00"), // IGST ITC
                new BigDecimal("400.00"),  // CGST ITC
                new BigDecimal("300.00")   // SGST ITC
        );

        TaxOffsetResult result = offsetEngine.calculateOffset(liability, itc);

        // Step 1: IGST output 2000 offset by IGST ITC 1200 -> rem IGST liability = 800
        assertEquals(new BigDecimal("1200.00"), result.getIgstOffsetByIgst());
        assertEquals(new BigDecimal("800.00"), result.getNetCashIgst());

        // Step 2 & 3: IGST ITC exhausted, no remaining for CGST/SGST
        assertEquals(new BigDecimal("0.00"), result.getCgstOffsetByIgst());
        assertEquals(new BigDecimal("0.00"), result.getSgstOffsetByIgst());

        // Step 4: CGST output 1000 offset by CGST ITC 400 -> rem CGST liability = 600
        assertEquals(new BigDecimal("400.00"), result.getCgstOffsetByCgst());
        assertEquals(new BigDecimal("600.00"), result.getNetCashCgst());

        // Step 5: SGST output 1000 offset by SGST ITC 300 -> rem SGST liability = 700
        assertEquals(new BigDecimal("300.00"), result.getSgstOffsetBySgst());
        assertEquals(new BigDecimal("700.00"), result.getNetCashSgst());

        // Total cash payable: 800 + 600 + 700 = 2100.00
        assertEquals(new BigDecimal("2100.00"), result.getTotalCashPayable());

        // Remaining ITC
        assertEquals(new BigDecimal("0.00"), result.getRemainingItcIgst());
        assertEquals(new BigDecimal("0.00"), result.getRemainingItcCgst());
        assertEquals(new BigDecimal("0.00"), result.getRemainingItcSgst());
        assertEquals(new BigDecimal("0.00"), result.getTotalRemainingItc());
    }

    @Test
    @DisplayName("Statutory restriction: CGST ITC cannot offset SGST liability and vice-versa")
    void testCrossUtilizationRestriction() {
        TaxLiability liability = new TaxLiability(
                BigDecimal.ZERO,
                new BigDecimal("1000.00"), // CGST
                new BigDecimal("1000.00")  // SGST
        );

        ItcBalance itc = new ItcBalance(
                BigDecimal.ZERO,
                new BigDecimal("1500.00"), // Surplus CGST ITC
                new BigDecimal("200.00")   // Deficit SGST ITC
        );

        TaxOffsetResult result = offsetEngine.calculateOffset(liability, itc);

        // CGST liability offset fully by CGST ITC (1000 used out of 1500)
        assertEquals(new BigDecimal("0.00"), result.getNetCashCgst());
        assertEquals(new BigDecimal("1000.00"), result.getCgstOffsetByCgst());
        assertEquals(new BigDecimal("500.00"), result.getRemainingItcCgst());

        // SGST liability offset by SGST ITC 200 -> rem SGST liability = 800.
        // CGST ITC 500 CANNOT cross-utilize to offset SGST!
        assertEquals(new BigDecimal("200.00"), result.getSgstOffsetBySgst());
        assertEquals(new BigDecimal("800.00"), result.getNetCashSgst(),
                "Surplus CGST ITC cannot offset SGST liability; remaining SGST must be paid in cash");

        // Total cash payable = 800.00
        assertEquals(new BigDecimal("800.00"), result.getTotalCashPayable());
        // Remaining unutilized CGST ITC = 500.00
        assertEquals(new BigDecimal("500.00"), result.getRemainingItcCgst());
    }

    @Test
    @DisplayName("Rule 88A Waterfall Order: IGST ITC exhausts on IGST first, then CGST, then SGST")
    void testRule88AWaterfallPriority() {
        TaxLiability liability = new TaxLiability(
                new BigDecimal("500.00"),  // IGST
                new BigDecimal("500.00"),  // CGST
                new BigDecimal("500.00")   // SGST
        );

        ItcBalance itc = new ItcBalance(
                new BigDecimal("800.00"),  // IGST ITC only
                BigDecimal.ZERO,
                BigDecimal.ZERO
        );

        TaxOffsetResult result = offsetEngine.calculateOffset(liability, itc);

        // Step 1: 500 of IGST ITC offsets 500 IGST output -> 0 cash IGST, 300 IGST ITC remaining
        assertEquals(new BigDecimal("0.00"), result.getNetCashIgst());
        assertEquals(new BigDecimal("500.00"), result.getIgstOffsetByIgst());

        // Step 2: 300 remaining IGST ITC offsets 300 of CGST output -> 200 cash CGST, 0 IGST ITC remaining
        assertEquals(new BigDecimal("300.00"), result.getCgstOffsetByIgst());
        assertEquals(new BigDecimal("200.00"), result.getNetCashCgst());

        // Step 3: 0 IGST ITC left for SGST -> 500 cash SGST
        assertEquals(new BigDecimal("0.00"), result.getSgstOffsetByIgst());
        assertEquals(new BigDecimal("500.00"), result.getNetCashSgst());

        assertEquals(new BigDecimal("700.00"), result.getTotalCashPayable());
        assertEquals(new BigDecimal("0.00"), result.getTotalRemainingItc());
    }

    @Test
    @DisplayName("Zero amounts edge cases: graceful handling of zero liabilities and ITCs")
    void testZeroEdgeCases() {
        TaxLiability zeroLiability = new TaxLiability(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
        ItcBalance zeroItc = new ItcBalance(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);

        TaxOffsetResult result = offsetEngine.calculateOffset(zeroLiability, zeroItc);

        assertEquals(new BigDecimal("0.00"), result.getTotalCashPayable());
        assertEquals(new BigDecimal("0.00"), result.getTotalRemainingItc());

        // Liability zero, positive ITC -> all ITC carried forward
        ItcBalance positiveItc = new ItcBalance(new BigDecimal("100.00"), new BigDecimal("200.00"), new BigDecimal("300.00"));
        TaxOffsetResult resultWithCredit = offsetEngine.calculateOffset(zeroLiability, positiveItc);

        assertEquals(new BigDecimal("0.00"), resultWithCredit.getTotalCashPayable());
        assertEquals(new BigDecimal("600.00"), resultWithCredit.getTotalRemainingItc());
        assertEquals(new BigDecimal("100.00"), resultWithCredit.getRemainingItcIgst());
        assertEquals(new BigDecimal("200.00"), resultWithCredit.getRemainingItcCgst());
        assertEquals(new BigDecimal("300.00"), resultWithCredit.getRemainingItcSgst());
    }

    @Test
    @DisplayName("Negative tax amounts throw IllegalArgumentException")
    void testNegativeAmountsValidation() {
        assertThrows(IllegalArgumentException.class, () ->
                new TaxLiability(new BigDecimal("-10.00"), BigDecimal.ZERO, BigDecimal.ZERO));

        assertThrows(IllegalArgumentException.class, () ->
                new ItcBalance(BigDecimal.ZERO, new BigDecimal("-5.00"), BigDecimal.ZERO));

        assertThrows(IllegalArgumentException.class, () ->
                offsetEngine.calculateOffset(
                        new BigDecimal("-1.00"), BigDecimal.ZERO, BigDecimal.ZERO,
                        BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO));
    }
}
