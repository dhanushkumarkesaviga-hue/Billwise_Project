package com.billwise.invoice.service;

import com.billwise.common.exception.ResourceNotFoundException;
import com.billwise.common.util.GstTaxCalculationUtil;
import com.billwise.common.util.GstValidationUtil;
import com.billwise.invoice.dto.SalesInvoiceDtos.SalesInvoiceStatsDto;
import com.billwise.invoice.entity.SalesInvoice;
import com.billwise.invoice.repository.SalesInvoiceRepository;
import com.billwise.invoice.security.AuthenticatedUser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Year;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.ThreadLocalRandom;

@Slf4j
@Service
@RequiredArgsConstructor
public class SalesInvoiceService {

    private final SalesInvoiceRepository salesInvoiceRepository;

    public List<SalesInvoice> getAllSalesInvoices(
            AuthenticatedUser user,
            LocalDate from,
            LocalDate to,
            String status,
            String supplyType
    ) {
        String merchantId = resolveMerchantId(user);
        List<SalesInvoice> list = (merchantId != null)
                ? salesInvoiceRepository.findByMerchantId(merchantId)
                : salesInvoiceRepository.findAll();

        return list.stream()
                .filter(s -> from == null || (s.getInvoiceDate() != null && !s.getInvoiceDate().isBefore(from)))
                .filter(s -> to == null || (s.getInvoiceDate() != null && !s.getInvoiceDate().isAfter(to)))
                .filter(s -> status == null || status.isBlank() || status.equalsIgnoreCase(s.getStatus()))
                .filter(s -> supplyType == null || supplyType.isBlank() || supplyType.equalsIgnoreCase(s.getSupplyType()))
                .sorted((a, b) -> {
                    if (a.getInvoiceDate() == null) return 1;
                    if (b.getInvoiceDate() == null) return -1;
                    return b.getInvoiceDate().compareTo(a.getInvoiceDate());
                })
                .toList();
    }

    public SalesInvoice getSalesInvoiceById(String id, AuthenticatedUser user) {
        SalesInvoice inv = salesInvoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sales Invoice not found with ID: " + id));

        validateOwnership(inv, user);
        return inv;
    }

    public SalesInvoice createSalesInvoice(SalesInvoice salesInvoice, AuthenticatedUser user) {
        String merchantId = resolveMerchantId(user);
        if (merchantId != null) {
            salesInvoice.setMerchantId(merchantId);
        }
        if (user != null) {
            salesInvoice.setCreatedBy(user.getUsername());
        }

        if (salesInvoice.getId() == null || salesInvoice.getId().isBlank()) {
            salesInvoice.setId(generateSalesInvoiceId());
        }

        recomputeTaxesIfMissing(salesInvoice);

        salesInvoice.setCreatedAt(Instant.now());
        salesInvoice.setUpdatedAt(Instant.now());

        log.info("Creating new Sales Invoice: {} for merchant: {}", salesInvoice.getId(), salesInvoice.getMerchantId());
        return salesInvoiceRepository.save(salesInvoice);
    }

    public SalesInvoice updateSalesInvoice(String id, SalesInvoice updated, AuthenticatedUser user) {
        SalesInvoice existing = getSalesInvoiceById(id, user);

        existing.setCustomerName(updated.getCustomerName());
        existing.setCustomerGstin(updated.getCustomerGstin());
        existing.setInvoiceNumber(updated.getInvoiceNumber());
        existing.setInvoiceDate(updated.getInvoiceDate());
        existing.setDueDate(updated.getDueDate());
        existing.setHsnSac(updated.getHsnSac());
        existing.setTaxableAmount(updated.getTaxableAmount());
        existing.setGstRate(updated.getGstRate());
        existing.setCgst(updated.getCgst());
        existing.setSgst(updated.getSgst());
        existing.setIgst(updated.getIgst());
        existing.setTotalAmount(updated.getTotalAmount());
        existing.setSupplyType(updated.getSupplyType());
        existing.setStatus(updated.getStatus());
        existing.setPlaceOfSupply(updated.getPlaceOfSupply());
        existing.setNotes(updated.getNotes());
        existing.setUpdatedAt(Instant.now());

        recomputeTaxesIfMissing(existing);

        log.info("Updating Sales Invoice: {} for merchant: {}", id, existing.getMerchantId());
        return salesInvoiceRepository.save(existing);
    }

    public void deleteSalesInvoice(String id, AuthenticatedUser user) {
        SalesInvoice existing = getSalesInvoiceById(id, user);
        log.info("Deleting Sales Invoice: {} by user: {}", id, user != null ? user.getUsername() : "system");
        salesInvoiceRepository.deleteById(existing.getId());
    }

    public SalesInvoiceStatsDto getSalesStats(AuthenticatedUser user) {
        String merchantId = resolveMerchantId(user);
        List<SalesInvoice> invoices = (merchantId != null)
                ? salesInvoiceRepository.findByMerchantId(merchantId)
                : salesInvoiceRepository.findAll();

        BigDecimal totalTaxable = BigDecimal.ZERO;
        BigDecimal totalTax = BigDecimal.ZERO;
        BigDecimal totalSales = BigDecimal.ZERO;
        long b2b = 0;
        long b2c = 0;
        long export = 0;
        long draft = 0;
        long issued = 0;
        long cancelled = 0;

        for (SalesInvoice s : invoices) {
            BigDecimal tax = nz(s.getCgst()).add(nz(s.getSgst())).add(nz(s.getIgst()));
            if (!"Cancelled".equalsIgnoreCase(s.getStatus())) {
                totalTaxable = totalTaxable.add(nz(s.getTaxableAmount()));
                totalTax = totalTax.add(tax);
                totalSales = totalSales.add(nz(s.getTotalAmount()));
            }

            String st = s.getSupplyType() != null ? s.getSupplyType().toUpperCase() : "B2B";
            if ("B2B".equals(st)) b2b++;
            else if ("B2C".equals(st)) b2c++;
            else if ("EXPORT".equals(st) || "SEZ".equals(st)) export++;

            String status = s.getStatus() != null ? s.getStatus() : "Issued";
            if ("Draft".equalsIgnoreCase(status)) draft++;
            else if ("Issued".equalsIgnoreCase(status)) issued++;
            else if ("Cancelled".equalsIgnoreCase(status)) cancelled++;
        }

        return SalesInvoiceStatsDto.builder()
                .totalSalesInvoices(invoices.size())
                .totalTaxableRevenue(totalTaxable.setScale(2, RoundingMode.HALF_UP))
                .totalOutputTax(totalTax.setScale(2, RoundingMode.HALF_UP))
                .totalSalesValue(totalSales.setScale(2, RoundingMode.HALF_UP))
                .b2bCount(b2b)
                .b2cCount(b2c)
                .exportCount(export)
                .draftCount(draft)
                .issuedCount(issued)
                .cancelledCount(cancelled)
                .build();
    }

    private void recomputeTaxesIfMissing(SalesInvoice s) {
        if (s.getTaxableAmount() == null) {
            s.setTaxableAmount(BigDecimal.ZERO);
        }
        if (s.getGstRate() == null) {
            s.setGstRate(18.0);
        }

        // Auto-derive placeOfSupply from customer GSTIN if missing
        if ((s.getPlaceOfSupply() == null || s.getPlaceOfSupply().isBlank())
                && s.getCustomerGstin() != null && s.getCustomerGstin().trim().length() >= 2) {
            s.setPlaceOfSupply(GstValidationUtil.extractStateCode(s.getCustomerGstin().trim()));
        }

        // If CGST/SGST/IGST are all zero or totalAmount is zero, compute using calculation util
        boolean taxesZero = (s.getCgst() == null || s.getCgst().compareTo(BigDecimal.ZERO) == 0)
                && (s.getSgst() == null || s.getSgst().compareTo(BigDecimal.ZERO) == 0)
                && (s.getIgst() == null || s.getIgst().compareTo(BigDecimal.ZERO) == 0);

        if (taxesZero || s.getTotalAmount() == null || s.getTotalAmount().compareTo(BigDecimal.ZERO) == 0) {
            // Default supplier state if not known: fallback to 27 or placeOfSupply
            String supplierState = "27"; // Standard default
            String recipientState = (s.getPlaceOfSupply() != null && !s.getPlaceOfSupply().isBlank())
                    ? s.getPlaceOfSupply()
                    : supplierState;

            GstTaxCalculationUtil.TaxBreakdown breakdown = GstTaxCalculationUtil.calculateTaxes(
                    s.getTaxableAmount(),
                    s.getGstRate(),
                    supplierState,
                    recipientState,
                    s.getSupplyType()
            );

            s.setCgst(breakdown.getCgst());
            s.setSgst(breakdown.getSgst());
            s.setIgst(breakdown.getIgst());
            s.setTotalAmount(breakdown.getTotalAmount());
        }
    }

    private String resolveMerchantId(AuthenticatedUser user) {
        if (user == null || user.isSuperAdmin()) {
            return null;
        }
        return user.getMerchantId();
    }

    private void validateOwnership(SalesInvoice inv, AuthenticatedUser user) {
        if (user != null && !user.isSuperAdmin()) {
            String userMerchantId = user.getMerchantId();
            if (userMerchantId == null || !userMerchantId.equals(inv.getMerchantId())) {
                throw new AccessDeniedException("Access denied: You do not have permission to access this sales invoice.");
            }
        }
    }

    private String generateSalesInvoiceId() {
        int year = Year.now().getValue();
        int random = ThreadLocalRandom.current().nextInt(1000, 10000);
        String candidate = "SINV-" + year + "-" + random;
        while (salesInvoiceRepository.existsById(candidate)) {
            random = ThreadLocalRandom.current().nextInt(1000, 10000);
            candidate = "SINV-" + year + "-" + random;
        }
        return candidate;
    }

    private BigDecimal nz(BigDecimal val) {
        return val != null ? val : BigDecimal.ZERO;
    }
}
