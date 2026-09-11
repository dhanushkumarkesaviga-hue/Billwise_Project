package com.billwise.invoice.service;

import com.billwise.invoice.dto.SalesInvoiceDtos.Gstr3bSummaryDto;
import com.billwise.invoice.entity.Invoice;
import com.billwise.invoice.entity.SalesInvoice;
import com.billwise.invoice.repository.InvoiceRepository;
import com.billwise.invoice.repository.SalesInvoiceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class GstrSummaryServiceTest {

    @Mock
    private SalesInvoiceRepository salesInvoiceRepository;

    @Mock
    private InvoiceRepository invoiceRepository;

    @InjectMocks
    private GstrSummaryService gstrSummaryService;

    private static final String MERCHANT_ID = "merchant-test-123";
    private static final LocalDate FROM_DATE = LocalDate.of(2026, 3, 1);
    private static final LocalDate TO_DATE = LocalDate.of(2026, 3, 31);

    @Test
    @DisplayName("Verify Section 17(5) ITC Filtering: Net Payable must only subtract Eligible ITC and completely exclude Blocked ITC")
    public void testSection17_5_ItcFilteringInNetLiabilityCalculation() {
        // GIVEN:
        // 1. One Sales Invoice with ₹18,000 Output Tax (CGST 9,000 + SGST 9,000)
        SalesInvoice salesInv = new SalesInvoice();
        salesInv.setId("SINV-001");
        salesInv.setMerchantId(MERCHANT_ID);
        salesInv.setInvoiceNumber("SALES-2026-001");
        salesInv.setInvoiceDate(LocalDate.of(2026, 3, 10));
        salesInv.setTaxableAmount(new BigDecimal("100000.00"));
        salesInv.setGstRate(18.0);
        salesInv.setCgst(new BigDecimal("9000.00"));
        salesInv.setSgst(new BigDecimal("9000.00"));
        salesInv.setIgst(BigDecimal.ZERO);
        salesInv.setTotalAmount(new BigDecimal("118000.00"));
        salesInv.setStatus("Issued");

        // 2. Purchase Invoice 1: Eligible ITC of ₹3,600 (X) e.g., Cloud Servers
        Invoice eligiblePurchase = new Invoice();
        eligiblePurchase.setId("PINV-001");
        eligiblePurchase.setMerchantId(MERCHANT_ID);
        eligiblePurchase.setVendorName("AWS Cloud Services");
        eligiblePurchase.setInvoiceDate(LocalDate.of(2026, 3, 12));
        eligiblePurchase.setTaxableAmount(new BigDecimal("20000.00"));
        eligiblePurchase.setGstRate(18.0);
        eligiblePurchase.setCgst(new BigDecimal("1800.00"));
        eligiblePurchase.setSgst(new BigDecimal("1800.00"));
        eligiblePurchase.setIgst(BigDecimal.ZERO);
        eligiblePurchase.setTotalAmount(new BigDecimal("23600.00"));
        eligiblePurchase.setItcEligibility("Eligible");
        eligiblePurchase.setItcAmount(new BigDecimal("3600.00"));
        eligiblePurchase.setStatus("Approved");

        // 3. Purchase Invoice 2: Section 17(5) Blocked ITC of ₹1,800 (Y) e.g., Food & Entertainment / Catering
        Invoice blockedPurchase = new Invoice();
        blockedPurchase.setId("PINV-002");
        blockedPurchase.setMerchantId(MERCHANT_ID);
        blockedPurchase.setVendorName("Taj Catering & Dining");
        blockedPurchase.setCategory("Food & Entertainment");
        blockedPurchase.setInvoiceDate(LocalDate.of(2026, 3, 15));
        blockedPurchase.setTaxableAmount(new BigDecimal("10000.00"));
        blockedPurchase.setGstRate(18.0);
        blockedPurchase.setCgst(new BigDecimal("9000.00")); // wait: 900 CGST + 900 SGST
        blockedPurchase.setCgst(new BigDecimal("900.00"));
        blockedPurchase.setSgst(new BigDecimal("900.00"));
        blockedPurchase.setIgst(BigDecimal.ZERO);
        blockedPurchase.setTotalAmount(new BigDecimal("11800.00"));
        blockedPurchase.setItcEligibility("Ineligible (Sec 17(5))");
        blockedPurchase.setItcAmount(BigDecimal.ZERO);
        blockedPurchase.setStatus("Approved");

        when(salesInvoiceRepository.findByMerchantId(MERCHANT_ID)).thenReturn(List.of(salesInv));
        when(invoiceRepository.findByMerchantId(MERCHANT_ID)).thenReturn(List.of(eligiblePurchase, blockedPurchase));

        // WHEN:
        Gstr3bSummaryDto result = gstrSummaryService.calculateNetLiability(MERCHANT_ID, FROM_DATE, TO_DATE);

        // THEN:
        // Output Tax = ₹18,000.00
        assertEquals(new BigDecimal("18000.00"), result.getTotalOutputTax());

        // Eligible ITC must be ₹3,600.00 (X) - ONLY the eligible purchase invoice
        assertEquals(new BigDecimal("3600.00"), result.getTotalEligibleItc());
        assertEquals(1, result.getEligiblePurchaseInvoiceCount());

        // Blocked Section 17(5) ITC must be ₹1,800.00 (Y) - recorded for Table 4(D) reporting
        assertEquals(new BigDecimal("1800.00"), result.getTotalIneligibleItc());
        assertEquals(1, result.getIneligiblePurchaseInvoiceCount());

        // CRITICAL COMPLIANCE ASSERTION:
        // Net Payable MUST be Output Tax - X (18,000 - 3,600 = ₹14,400.00)
        // NOT Output Tax - (X + Y) (18,000 - 5,400 = ₹12,600.00)
        assertEquals(new BigDecimal("14400.00"), result.getNetTaxLiability());
        assertEquals(new BigDecimal("14400.00"), result.getNetPayableAmount());
        assertEquals("PAYABLE", result.getLiabilityType());
        assertEquals(BigDecimal.ZERO.setScale(2), result.getCarryForwardCreditAmount());
        assertNotEquals(new BigDecimal("12600.00"), result.getNetPayableAmount(),
                "Net liability must NOT subtract blocked Section 17(5) tax!");
    }

    @Test
    @DisplayName("Verify Ineligible (Sec 17(5)) with non-zero itcAmount field is still strictly excluded")
    public void testSection17_5_NonZeroItcAmountStillExcluded() {
        // Edge case: If an invoice marked "Ineligible (Sec 17(5))" somehow had itcAmount set to non-zero,
        // it must still be strictly excluded because itcEligibility is not "Eligible"
        Invoice dirtyBlockedPurchase = new Invoice();
        dirtyBlockedPurchase.setId("PINV-003");
        dirtyBlockedPurchase.setMerchantId(MERCHANT_ID);
        dirtyBlockedPurchase.setInvoiceDate(LocalDate.of(2026, 3, 20));
        dirtyBlockedPurchase.setTaxableAmount(new BigDecimal("5000.00"));
        dirtyBlockedPurchase.setCgst(new BigDecimal("450.00"));
        dirtyBlockedPurchase.setSgst(new BigDecimal("450.00"));
        dirtyBlockedPurchase.setIgst(BigDecimal.ZERO);
        dirtyBlockedPurchase.setTotalAmount(new BigDecimal("5900.00"));
        dirtyBlockedPurchase.setItcEligibility("Ineligible (Sec 17(5))");
        dirtyBlockedPurchase.setItcAmount(new BigDecimal("900.00")); // Stale / dirty value

        when(salesInvoiceRepository.findByMerchantId(MERCHANT_ID)).thenReturn(List.of());
        when(invoiceRepository.findByMerchantId(MERCHANT_ID)).thenReturn(List.of(dirtyBlockedPurchase));

        Gstr3bSummaryDto result = gstrSummaryService.calculateNetLiability(MERCHANT_ID, FROM_DATE, TO_DATE);

        assertEquals(BigDecimal.ZERO.setScale(2), result.getTotalEligibleItc());
        assertEquals(0, result.getEligiblePurchaseInvoiceCount());
        assertEquals(new BigDecimal("900.00"), result.getTotalIneligibleItc());
        assertEquals(1, result.getIneligiblePurchaseInvoiceCount());
    }

    @Test
    @DisplayName("Verify Excess Eligible ITC creates CARRY_FORWARD credit")
    public void testExcessEligibleItcCarryForward() {
        // Sales: Output Tax ₹5,000 (CGST 2500 + SGST 2500)
        SalesInvoice sales = new SalesInvoice();
        sales.setMerchantId(MERCHANT_ID);
        sales.setInvoiceDate(LocalDate.of(2026, 3, 10));
        sales.setCgst(new BigDecimal("2500.00"));
        sales.setSgst(new BigDecimal("2500.00"));
        sales.setIgst(BigDecimal.ZERO);
        sales.setStatus("Issued");

        // Purchase 1: Eligible ITC ₹8,000 (CGST 4000 + SGST 4000)
        Invoice eligible = new Invoice();
        eligible.setMerchantId(MERCHANT_ID);
        eligible.setInvoiceDate(LocalDate.of(2026, 3, 12));
        eligible.setCgst(new BigDecimal("4000.00"));
        eligible.setSgst(new BigDecimal("4000.00"));
        eligible.setIgst(BigDecimal.ZERO);
        eligible.setItcEligibility("Eligible");
        eligible.setItcAmount(new BigDecimal("8000.00"));

        // Purchase 2: Blocked Sec 17(5) ITC ₹3,000 (CGST 1500 + SGST 1500)
        Invoice blocked = new Invoice();
        blocked.setMerchantId(MERCHANT_ID);
        blocked.setInvoiceDate(LocalDate.of(2026, 3, 15));
        blocked.setCgst(new BigDecimal("1500.00"));
        blocked.setSgst(new BigDecimal("1500.00"));
        blocked.setIgst(BigDecimal.ZERO);
        blocked.setItcEligibility("Ineligible (Sec 17(5))");
        blocked.setItcAmount(BigDecimal.ZERO);

        when(salesInvoiceRepository.findByMerchantId(MERCHANT_ID)).thenReturn(List.of(sales));
        when(invoiceRepository.findByMerchantId(MERCHANT_ID)).thenReturn(List.of(eligible, blocked));

        Gstr3bSummaryDto result = gstrSummaryService.calculateNetLiability(MERCHANT_ID, FROM_DATE, TO_DATE);

        // Output Tax: ₹5,000
        // Eligible ITC: ₹8,000
        // Blocked ITC: ₹3,000 (must NOT be counted)
        // Carry Forward: 8,000 - 5,000 = ₹3,000 (NOT 11,000 - 5,000 = ₹6,000)
        assertEquals(new BigDecimal("5000.00"), result.getTotalOutputTax());
        assertEquals(new BigDecimal("8000.00"), result.getTotalEligibleItc());
        assertEquals(new BigDecimal("3000.00"), result.getTotalIneligibleItc());
        assertEquals("CARRY_FORWARD", result.getLiabilityType());
        assertEquals(BigDecimal.ZERO.setScale(2), result.getNetPayableAmount());
        assertEquals(new BigDecimal("3000.00"), result.getCarryForwardCreditAmount());
    }

    @Test
    @DisplayName("Verify isItcEligible helper across various edge-case eligibility strings")
    public void testIsItcEligibleHelperCases() {
        Invoice inv = new Invoice();

        inv.setItcEligibility("Eligible");
        assertTrue(GstrSummaryService.isItcEligible(inv));

        inv.setItcEligibility("Eligible (RCM)");
        assertTrue(GstrSummaryService.isItcEligible(inv));

        inv.setItcEligibility("eligible");
        assertTrue(GstrSummaryService.isItcEligible(inv));

        inv.setItcEligibility("Ineligible (Sec 17(5))");
        assertFalse(GstrSummaryService.isItcEligible(inv));
        assertTrue(GstrSummaryService.isItcIneligible(inv));

        inv.setItcEligibility("Ineligible (Bill of Supply)");
        assertFalse(GstrSummaryService.isItcEligible(inv));
        assertTrue(GstrSummaryService.isItcIneligible(inv));

        inv.setItcEligibility("Ineligible");
        assertFalse(GstrSummaryService.isItcEligible(inv));
        assertTrue(GstrSummaryService.isItcIneligible(inv));

        inv.setItcEligibility("Blocked (Sec 17(5))");
        assertFalse(GstrSummaryService.isItcEligible(inv));
        assertTrue(GstrSummaryService.isItcIneligible(inv));

        inv.setItcEligibility(null);
        assertFalse(GstrSummaryService.isItcEligible(inv));
        assertFalse(GstrSummaryService.isItcIneligible(inv));

        assertFalse(GstrSummaryService.isItcEligible(null));
        assertFalse(GstrSummaryService.isItcIneligible(null));
    }
}
