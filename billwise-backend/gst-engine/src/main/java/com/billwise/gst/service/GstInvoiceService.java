package com.billwise.gst.service;

import com.billwise.gst.entity.Invoice;
import com.billwise.gst.entity.InvoiceItem;
import com.billwise.gst.repository.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

/**
 * Service for calculating GST compliant invoices for B2B/B2C transactions.
 * Determines inter-state (IGST) vs intra-state (CGST + SGST split) classification
 * and performs precision arithmetic using BigDecimal (scale 2, HALF_UP).
 */
@Service
@RequiredArgsConstructor
public class GstInvoiceService {

    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final BigDecimal TWO = new BigDecimal("2");

    private final InvoiceRepository invoiceRepository;

    /**
     * Determines whether a supply is inter-state or intra-state.
     * Inter-state applies if supplier and recipient state codes differ.
     */
    public boolean isInterState(String supplierStateCode, String recipientStateCode) {
        String cleanSupplier = normalizeStateCode(supplierStateCode, "Supplier state code");
        String cleanRecipient = normalizeStateCode(recipientStateCode, "Recipient state code");
        return !cleanSupplier.equalsIgnoreCase(cleanRecipient);
    }

    /**
     * Calculates tax amounts for all line items and aggregates invoice-level totals.
     */
    public Invoice calculateInvoiceTaxes(Invoice invoice) {
        Objects.requireNonNull(invoice, "Invoice must not be null");

        String supplierCode = normalizeStateCode(invoice.getSupplierStateCode(), "Supplier state code");
        String recipientCode = normalizeStateCode(invoice.getRecipientStateCode(), "Recipient state code");
        boolean interState = !supplierCode.equalsIgnoreCase(recipientCode);

        invoice.setSupplierStateCode(supplierCode);
        invoice.setRecipientStateCode(recipientCode);
        invoice.setInterState(interState);

        BigDecimal sumTaxable = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal sumCgst = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal sumSgst = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal sumIgst = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        if (invoice.getItems() != null) {
            for (InvoiceItem item : invoice.getItems()) {
                calculateItemTax(item, interState);
                sumTaxable = sumTaxable.add(item.getTaxableAmount());
                sumCgst = sumCgst.add(item.getCgstAmount());
                sumSgst = sumSgst.add(item.getSgstAmount());
                sumIgst = sumIgst.add(item.getIgstAmount());
            }
        }

        invoice.setTotalTaxableAmount(sumTaxable);
        invoice.setTotalCgst(sumCgst);
        invoice.setTotalSgst(sumSgst);
        invoice.setTotalIgst(sumIgst);
        invoice.setGrandTotal(sumTaxable.add(sumCgst).add(sumSgst).add(sumIgst).setScale(2, RoundingMode.HALF_UP));

        return invoice;
    }

    /**
     * Calculates line item tax and totals.
     */
    public void calculateItemTax(InvoiceItem item, boolean isInterState) {
        Objects.requireNonNull(item, "InvoiceItem must not be null");

        BigDecimal qty = item.getQuantity() != null ? item.getQuantity() : BigDecimal.ONE;
        BigDecimal price = item.getUnitPrice() != null ? item.getUnitPrice() : BigDecimal.ZERO;
        BigDecimal rate = item.getGstRate() != null ? item.getGstRate() : BigDecimal.ZERO;

        if (qty.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Quantity cannot be negative");
        }
        if (price.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Unit price cannot be negative");
        }
        if (rate.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("GST rate cannot be negative");
        }

        BigDecimal taxable = item.getTaxableAmount();
        if (taxable == null) {
            taxable = qty.multiply(price).setScale(2, RoundingMode.HALF_UP);
        } else {
            taxable = taxable.setScale(2, RoundingMode.HALF_UP);
        }
        item.setTaxableAmount(taxable);

        BigDecimal cgst = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal sgst = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal igst = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        if (isInterState) {
            // Apply full GST rate to IGST: (taxable * rate) / 100
            igst = taxable.multiply(rate).divide(HUNDRED, 2, RoundingMode.HALF_UP);
        } else {
            // Split equally into CGST and SGST: (taxable * (rate / 2)) / 100
            BigDecimal halfRate = rate.divide(TWO, 4, RoundingMode.HALF_UP);
            cgst = taxable.multiply(halfRate).divide(HUNDRED, 2, RoundingMode.HALF_UP);
            sgst = taxable.multiply(halfRate).divide(HUNDRED, 2, RoundingMode.HALF_UP);
        }

        item.setCgstAmount(cgst);
        item.setSgstAmount(sgst);
        item.setIgstAmount(igst);
        item.setItemTotal(taxable.add(cgst).add(sgst).add(igst).setScale(2, RoundingMode.HALF_UP));
    }

    /**
     * Calculates GST and persists the invoice under the active tenant context.
     */
    @Transactional
    public Invoice saveInvoice(Invoice invoice) {
        Invoice calculated = calculateInvoiceTaxes(invoice);
        return invoiceRepository.save(calculated);
    }

    /**
     * Normalizes and validates the 2-character state code (handles digits like "29" or alpha like "KA").
     * If a 15-character GSTIN is passed, extracts the first 2 state digits.
     */
    public String normalizeStateCode(String input, String fieldName) {
        if (input == null || input.trim().isEmpty()) {
            throw new IllegalArgumentException(fieldName + " must not be null or empty");
        }
        String trimmed = input.trim().toUpperCase();
        if (trimmed.length() >= 2) {
            return trimmed.substring(0, 2);
        }
        throw new IllegalArgumentException(fieldName + " must be at least 2 characters in length: " + input);
    }
}
