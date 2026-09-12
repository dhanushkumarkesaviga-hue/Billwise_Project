package com.billwise.gst.service;

import com.billwise.gst.context.TenantContext;
import com.billwise.gst.entity.Invoice;
import com.billwise.gst.entity.InvoiceItem;
import com.billwise.gst.repository.InvoiceRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class GstInvoiceServiceTest {

    @Autowired
    private GstInvoiceService gstInvoiceService;

    @Autowired
    private InvoiceRepository invoiceRepository;

    @BeforeEach
    void setUp() {
        TenantContext.clear();
        invoiceRepository.deleteAll();
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
        invoiceRepository.deleteAll();
    }

    @Test
    @DisplayName("Intra-state calculation: 18% GST splits equally into 9% CGST + 9% SGST")
    void testIntraStateInvoiceCalculation() {
        Invoice invoice = new Invoice();
        invoice.setInvoiceNumber("INV-INTRA-001");
        invoice.setInvoiceDate(LocalDate.of(2026, 9, 12));
        invoice.setSupplierStateCode("29"); // Karnataka
        invoice.setRecipientStateCode("29"); // Karnataka

        InvoiceItem item = new InvoiceItem();
        item.setHsnCode("998313");
        item.setQuantity(new BigDecimal("2.00"));
        item.setUnitPrice(new BigDecimal("500.00"));
        item.setTaxableAmount(new BigDecimal("1000.00"));
        item.setGstRate(new BigDecimal("18.00"));

        invoice.addItem(item);

        Invoice calculated = gstInvoiceService.calculateInvoiceTaxes(invoice);

        assertFalse(calculated.isInterState(), "Supply within same state must be intra-state");
        assertEquals(new BigDecimal("1000.00"), calculated.getTotalTaxableAmount());
        assertEquals(new BigDecimal("90.00"), calculated.getTotalCgst(), "9% CGST of 1000 is 90.00");
        assertEquals(new BigDecimal("90.00"), calculated.getTotalSgst(), "9% SGST of 1000 is 90.00");
        assertEquals(new BigDecimal("0.00"), calculated.getTotalIgst(), "Intra-state IGST must be 0.00");
        assertEquals(new BigDecimal("1180.00"), calculated.getGrandTotal(), "Grand total must be 1180.00");

        // Line item checks
        assertEquals(new BigDecimal("90.00"), item.getCgstAmount());
        assertEquals(new BigDecimal("90.00"), item.getSgstAmount());
        assertEquals(new BigDecimal("0.00"), item.getIgstAmount());
        assertEquals(new BigDecimal("1180.00"), item.getItemTotal());
    }

    @Test
    @DisplayName("Inter-state calculation: 18% GST applies fully to IGST")
    void testInterStateInvoiceCalculation() {
        Invoice invoice = new Invoice();
        invoice.setInvoiceNumber("INV-INTER-001");
        invoice.setInvoiceDate(LocalDate.of(2026, 9, 12));
        invoice.setSupplierStateCode("29"); // Karnataka
        invoice.setRecipientStateCode("27"); // Maharashtra

        InvoiceItem item = new InvoiceItem();
        item.setHsnCode("847130");
        item.setQuantity(new BigDecimal("1.00"));
        item.setUnitPrice(new BigDecimal("1000.00"));
        item.setTaxableAmount(new BigDecimal("1000.00"));
        item.setGstRate(new BigDecimal("18.00"));

        invoice.addItem(item);

        Invoice calculated = gstInvoiceService.calculateInvoiceTaxes(invoice);

        assertTrue(calculated.isInterState(), "Supply across different states must be inter-state");
        assertEquals(new BigDecimal("1000.00"), calculated.getTotalTaxableAmount());
        assertEquals(new BigDecimal("0.00"), calculated.getTotalCgst(), "Inter-state CGST must be 0.00");
        assertEquals(new BigDecimal("0.00"), calculated.getTotalSgst(), "Inter-state SGST must be 0.00");
        assertEquals(new BigDecimal("180.00"), calculated.getTotalIgst(), "18% IGST of 1000 is 180.00");
        assertEquals(new BigDecimal("1180.00"), calculated.getGrandTotal());

        // Line item checks
        assertEquals(new BigDecimal("0.00"), item.getCgstAmount());
        assertEquals(new BigDecimal("0.00"), item.getSgstAmount());
        assertEquals(new BigDecimal("180.00"), item.getIgstAmount());
        assertEquals(new BigDecimal("1180.00"), item.getItemTotal());
    }

    @Test
    @DisplayName("Multiple line items with varied rates (0%, 5%, 12%, 18%, 28%)")
    void testMultipleLineItemsWithVariedRates() {
        Invoice invoice = new Invoice();
        invoice.setInvoiceNumber("INV-MULTI-001");
        invoice.setInvoiceDate(LocalDate.of(2026, 9, 12));
        invoice.setSupplierStateCode("29");
        invoice.setRecipientStateCode("29");

        // 0% item: 100.00
        InvoiceItem item0 = new InvoiceItem();
        item0.setQuantity(new BigDecimal("1.00"));
        item0.setUnitPrice(new BigDecimal("100.00"));
        item0.setGstRate(new BigDecimal("0.00"));
        invoice.addItem(item0);

        // 5% item: 200.00 -> CGST 5.00, SGST 5.00
        InvoiceItem item5 = new InvoiceItem();
        item5.setQuantity(new BigDecimal("2.00"));
        item5.setUnitPrice(new BigDecimal("100.00"));
        item5.setGstRate(new BigDecimal("5.00"));
        invoice.addItem(item5);

        // 12% item: 100.00 -> CGST 6.00, SGST 6.00
        InvoiceItem item12 = new InvoiceItem();
        item12.setQuantity(new BigDecimal("1.00"));
        item12.setUnitPrice(new BigDecimal("100.00"));
        item12.setGstRate(new BigDecimal("12.00"));
        invoice.addItem(item12);

        // 18% item: 100.00 -> CGST 9.00, SGST 9.00
        InvoiceItem item18 = new InvoiceItem();
        item18.setQuantity(new BigDecimal("1.00"));
        item18.setUnitPrice(new BigDecimal("100.00"));
        item18.setGstRate(new BigDecimal("18.00"));
        invoice.addItem(item18);

        // 28% item: 100.00 -> CGST 14.00, SGST 14.00
        InvoiceItem item28 = new InvoiceItem();
        item28.setQuantity(new BigDecimal("1.00"));
        item28.setUnitPrice(new BigDecimal("100.00"));
        item28.setGstRate(new BigDecimal("28.00"));
        invoice.addItem(item28);

        Invoice calculated = gstInvoiceService.calculateInvoiceTaxes(invoice);

        // Total taxable = 100 + 200 + 100 + 100 + 100 = 600.00
        assertEquals(new BigDecimal("600.00"), calculated.getTotalTaxableAmount());
        // Total CGST = 0 + 5 + 6 + 9 + 14 = 34.00
        assertEquals(new BigDecimal("34.00"), calculated.getTotalCgst());
        // Total SGST = 0 + 5 + 6 + 9 + 14 = 34.00
        assertEquals(new BigDecimal("34.00"), calculated.getTotalSgst());
        // Total IGST = 0.00
        assertEquals(new BigDecimal("0.00"), calculated.getTotalIgst());
        // Grand total = 600 + 34 + 34 = 668.00
        assertEquals(new BigDecimal("668.00"), calculated.getGrandTotal());
    }

    @Test
    @DisplayName("Half-up rounding precision with fractional paise")
    void testPrecisionAndHalfUpRounding() {
        Invoice invoice = new Invoice();
        invoice.setInvoiceNumber("INV-ROUND-001");
        invoice.setInvoiceDate(LocalDate.of(2026, 9, 12));
        invoice.setSupplierStateCode("29");
        invoice.setRecipientStateCode("29");

        // Taxable: 33.33 * 3 = 99.99
        InvoiceItem item = new InvoiceItem();
        item.setQuantity(new BigDecimal("3.00"));
        item.setUnitPrice(new BigDecimal("33.33"));
        item.setGstRate(new BigDecimal("18.00"));
        invoice.addItem(item);

        Invoice calculated = gstInvoiceService.calculateInvoiceTaxes(invoice);

        assertEquals(new BigDecimal("99.99"), calculated.getTotalTaxableAmount());
        // 99.99 * 9% = 8.9991 -> HALF_UP rounds to 9.00
        assertEquals(new BigDecimal("9.00"), calculated.getTotalCgst());
        assertEquals(new BigDecimal("9.00"), calculated.getTotalSgst());
        // Grand total: 99.99 + 9.00 + 9.00 = 117.99
        assertEquals(new BigDecimal("117.99"), calculated.getGrandTotal());
    }

    @Test
    @DisplayName("TenantContext auto-populates tenant_id via @PrePersist on persistence")
    void testTenantContextAutoPopulation() {
        TenantContext.setTenantId("tenant-enterprise-101");

        Invoice invoice = new Invoice();
        invoice.setInvoiceNumber("INV-TENANT-001");
        invoice.setInvoiceDate(LocalDate.of(2026, 9, 12));
        invoice.setSupplierStateCode("29");
        invoice.setRecipientStateCode("27");

        InvoiceItem item = new InvoiceItem();
        item.setQuantity(new BigDecimal("1.00"));
        item.setUnitPrice(new BigDecimal("500.00"));
        item.setGstRate(new BigDecimal("18.00"));
        invoice.addItem(item);

        Invoice saved = gstInvoiceService.saveInvoice(invoice);

        assertNotNull(saved.getId());
        assertEquals("tenant-enterprise-101", saved.getTenantId(), "Invoice must have tenant_id auto-populated");
        assertNotNull(saved.getItems().get(0).getId());
        assertEquals("tenant-enterprise-101", saved.getItems().get(0).getTenantId(), "InvoiceItem must have tenant_id auto-populated");

        List<Invoice> tenantInvoices = invoiceRepository.findByTenantId("tenant-enterprise-101");
        assertEquals(1, tenantInvoices.size());
    }

    @Test
    @DisplayName("Persisting entity without TenantContext throws IllegalStateException")
    void testPersistWithoutTenantContextThrowsException() {
        TenantContext.clear();

        Invoice invoice = new Invoice();
        invoice.setInvoiceNumber("INV-FAIL-001");
        invoice.setInvoiceDate(LocalDate.of(2026, 9, 12));
        invoice.setSupplierStateCode("29");
        invoice.setRecipientStateCode("29");

        assertThrows(Exception.class, () -> gstInvoiceService.saveInvoice(invoice),
                "Saving without TenantContext must fail to enforce isolation");
    }

    @Test
    @DisplayName("Negative amounts or invalid state codes throw IllegalArgumentException")
    void testValidationEdgeCases() {
        Invoice invoice = new Invoice();
        invoice.setInvoiceNumber("INV-EDGE-001");
        invoice.setInvoiceDate(LocalDate.of(2026, 9, 12));
        invoice.setSupplierStateCode("29");
        invoice.setRecipientStateCode("29");

        InvoiceItem itemNegativeQty = new InvoiceItem();
        itemNegativeQty.setQuantity(new BigDecimal("-1.00"));
        itemNegativeQty.setUnitPrice(new BigDecimal("100.00"));
        itemNegativeQty.setGstRate(new BigDecimal("18.00"));
        invoice.addItem(itemNegativeQty);

        assertThrows(IllegalArgumentException.class, () -> gstInvoiceService.calculateInvoiceTaxes(invoice));

        // Invalid state code
        Invoice invoiceBlankState = new Invoice();
        invoiceBlankState.setSupplierStateCode("");
        invoiceBlankState.setRecipientStateCode("29");
        assertThrows(IllegalArgumentException.class, () -> gstInvoiceService.calculateInvoiceTaxes(invoiceBlankState));
    }
}
