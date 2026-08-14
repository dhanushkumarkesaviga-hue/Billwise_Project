package com.billwise.invoice.service;

import com.billwise.common.util.GstValidationUtil;
import com.billwise.invoice.dto.InvoiceDtos.LineItem;
import com.billwise.invoice.dto.InvoiceDtos.VlmExtractionResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.web.client.RestTemplateBuilder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class OllamaVisionServiceTest {

    private OllamaVisionService visionService;
    private ObjectMapper objectMapper;

    @BeforeEach
    public void setup() {
        objectMapper = new ObjectMapper();
        RestTemplateBuilder builder = new RestTemplateBuilder();
        visionService = new OllamaVisionService(
                builder,
                objectMapper,
                "http://localhost:11434",
                "llama3.2-vision:latest",
                120
        );
    }

    @Test
    @DisplayName("1. Standard Single-Rate Tax Invoice: Parses line items and computes accurate roll-ups")
    public void testStandardSingleRateInvoice() {
        String json = """
                {
                  "documentType": "tax_invoice",
                  "extractionConfidence": 0.95,
                  "vendorName": "Apex Technologies Pvt Ltd",
                  "gstin": "27AAPFU0939F1ZV",
                  "invoiceNumber": "INV-2026-0042",
                  "invoiceDate": "2026-08-10",
                  "hsnSac": "998313",
                  "lineItems": [
                    {
                      "description": "IT Consulting Services",
                      "hsnSac": "998313",
                      "quantity": 10.0,
                      "unitPrice": 5000.0,
                      "taxableValue": 50000.0,
                      "gstRate": 18.0,
                      "cgst": 4500.0,
                      "sgst": 4500.0,
                      "igst": 0.0,
                      "totalAmount": 59000.0
                    }
                  ]
                }
                """;

        VlmExtractionResult result = visionService.parseAndSanitizeJson(json);
        assertNotNull(result);
        assertEquals("tax_invoice", result.getDocumentType());
        assertEquals(0.95, result.getExtractionConfidence());
        assertEquals("Apex Technologies Pvt Ltd", result.getVendorName());
        assertEquals("27AAPFU0939F1ZV", result.getGstin());
        assertTrue(result.getIsGstinValid());
        assertEquals("INV-2026-0042", result.getInvoiceNumber());
        assertEquals("2026-08-10", result.getInvoiceDate());

        // Check line items
        assertNotNull(result.getLineItems());
        assertEquals(1, result.getLineItems().size());

        // Check roll-up totals
        assertEquals(50000.0, result.getTaxableAmount());
        assertEquals(4500.0, result.getCgst());
        assertEquals(4500.0, result.getSgst());
        assertEquals(0.0, result.getIgst());
        assertEquals(59000.0, result.getTotalAmount());
        assertEquals(18.0, result.getGstRate());
    }

    @Test
    @DisplayName("2. Multi-Rate Invoice: Correctly rolls up 12% + 18% line items with individual taxes")
    public void testMultiRateInvoiceRollup() {
        String json = """
                {
                  "documentType": "tax_invoice",
                  "extractionConfidence": 0.92,
                  "vendorName": "Shree Ganesh Hardware & Electricals",
                  "gstin": "33AABCS1429B1ZB",
                  "invoiceNumber": "SGH-8841",
                  "invoiceDate": "12/08/2026",
                  "hsnSac": "8544",
                  "lineItems": [
                    {
                      "description": "Copper Cables 2.5 sq mm",
                      "hsnSac": "8544",
                      "quantity": 2.0,
                      "unitPrice": 1500.0,
                      "taxableValue": 3000.0,
                      "gstRate": 18.0,
                      "cgst": 270.0,
                      "sgst": 270.0,
                      "igst": 0.0,
                      "totalAmount": 3540.0
                    },
                    {
                      "description": "LED Tube Fixtures 20W",
                      "hsnSac": "9405",
                      "quantity": 10.0,
                      "unitPrice": 200.0,
                      "taxableValue": 2000.0,
                      "gstRate": 12.0,
                      "cgst": 120.0,
                      "sgst": 120.0,
                      "igst": 0.0,
                      "totalAmount": 2240.0
                    }
                  ]
                }
                """;

        VlmExtractionResult result = visionService.parseAndSanitizeJson(json);
        assertNotNull(result);
        assertEquals("tax_invoice", result.getDocumentType());
        assertEquals("2026-08-12", result.getInvoiceDate()); // Normalized from 12/08/2026
        
        assertNotNull(result.getLineItems());
        assertEquals(2, result.getLineItems().size());

        // Multi-rate checks:
        // Item 1: Taxable 3000, CGST 270, SGST 270, Total 3540 (@18%)
        // Item 2: Taxable 2000, CGST 120, SGST 120, Total 2240 (@12%)
        // Authoritative Sums: Taxable = 5000, CGST = 390, SGST = 390, Grand Total = 5780
        assertEquals(5000.0, result.getTaxableAmount());
        assertEquals(390.0, result.getCgst());
        assertEquals(390.0, result.getSgst());
        assertEquals(0.0, result.getIgst());
        assertEquals(5780.0, result.getTotalAmount());

        // Effective rate = (780 / 5000) * 100 = 15.6%
        assertEquals(15.6, result.getGstRate());
    }

    @Test
    @DisplayName("3. Bill of Supply: Composition dealer with 0% GST does not trigger false arithmetic mismatch")
    public void testBillOfSupplyCompositionDealer() {
        String json = """
                {
                  "documentType": "bill_of_supply",
                  "extractionConfidence": 0.90,
                  "vendorName": "Sri Krishna Provision Stores",
                  "gstin": "29AABCU9603R1ZM",
                  "invoiceNumber": "BOS-1029",
                  "invoiceDate": "2026-08-01",
                  "lineItems": [
                    {
                      "description": "Organic Millets 5kg",
                      "taxableValue": 1200.0,
                      "gstRate": 0.0,
                      "cgst": 0.0,
                      "sgst": 0.0,
                      "igst": 0.0,
                      "totalAmount": 1200.0
                    },
                    {
                      "description": "Desi Ghee 1L",
                      "taxableValue": 800.0,
                      "gstRate": 0.0,
                      "cgst": 0.0,
                      "sgst": 0.0,
                      "igst": 0.0,
                      "totalAmount": 800.0
                    }
                  ]
                }
                """;

        VlmExtractionResult result = visionService.parseAndSanitizeJson(json);
        assertNotNull(result);
        assertEquals("bill_of_supply", result.getDocumentType());
        assertEquals(2000.0, result.getTaxableAmount());
        assertEquals(0.0, result.getCgst());
        assertEquals(0.0, result.getSgst());
        assertEquals(0.0, result.getIgst());
        assertEquals(0.0, result.getGstRate());
        assertEquals(2000.0, result.getTotalAmount());
    }

    @Test
    @DisplayName("4. Low-Confidence / Regional Text / Unclear Invoice: Captures uncertainty confidence score")
    public void testLowConfidenceRegionalInvoice() {
        String json = """
                {
                  "documentType": "unclear",
                  "extractionConfidence": 0.42,
                  "vendorName": "சரவண பவன் மெஸ் (Saravana Bhavan Mess)",
                  "gstin": "33AAAAA0000A1Z5",
                  "invoiceNumber": "REC-91",
                  "invoiceDate": "2026-08-05",
                  "taxableAmount": 450.0,
                  "gstRate": 5.0,
                  "cgst": 11.25,
                  "sgst": 11.25,
                  "totalAmount": 472.5
                }
                """;

        VlmExtractionResult result = visionService.parseAndSanitizeJson(json);
        assertNotNull(result);
        assertEquals("unclear", result.getDocumentType());
        assertEquals(0.42, result.getExtractionConfidence());
        assertTrue(result.getExtractionConfidence() < 0.50);
        assertTrue(result.getVendorName().contains("Saravana Bhavan"));
    }

    @Test
    @DisplayName("5. GSTIN Checksum Validation: Correctly validates valid GSTINs and flags corrupted digits")
    public void testGstinChecksumValidation() {
        // Valid GSTINs with valid Mod-36 check digit:
        // 27AAPFU0939F1ZV (Maharashtra, check digit 'V')
        // 33AABCS1429B1Z1 (Tamil Nadu, check digit '1')
        // 29AABCU9603R1ZJ (Karnataka, check digit 'J')
        assertTrue(GstValidationUtil.isValidGstin("27AAPFU0939F1ZV"));
        assertTrue(GstValidationUtil.isValidGstin("33AABCS1429B1Z1"));
        assertTrue(GstValidationUtil.isValidGstin("29AABCU9603R1ZJ"));

        // Invalid checksum (last digit corrupted from V to 5)
        assertFalse(GstValidationUtil.isValidGstin("27AAPFU0939F1Z5"));

        // Invalid state code 99
        assertFalse(GstValidationUtil.isValidGstin("99AAPFU0939F1ZV"));
    }
}
