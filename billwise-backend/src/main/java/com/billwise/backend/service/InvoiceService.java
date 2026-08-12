package com.billwise.backend.service;

import com.billwise.backend.entity.Invoice;
import com.billwise.backend.entity.Role;
import com.billwise.backend.entity.User;
import com.billwise.backend.exception.ResourceNotFoundException;
import com.billwise.backend.repository.InvoiceRepository;
import com.billwise.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Year;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

@Slf4j
@Service
@RequiredArgsConstructor
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final UserRepository userRepository;

    public List<Invoice> getAllInvoices() {
        return invoiceRepository.findAll();
    }

    public List<Invoice> getAllInvoices(String username) {
        if (username == null) {
            return invoiceRepository.findAll();
        }
        User user = getUser(username);
        if (user.getRole() == Role.SUPER_ADMIN) {
            return invoiceRepository.findAll();
        }
        if (user.getMerchantId() == null) {
            return List.of();
        }
        return invoiceRepository.findByMerchantId(user.getMerchantId());
    }

    public Invoice getInvoiceById(String id, String username) {
        Invoice inv = invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + id));

        if (username != null) {
            User user = getUser(username);
            if (user.getRole() != Role.SUPER_ADMIN && (user.getMerchantId() == null || !user.getMerchantId().equals(inv.getMerchantId()))) {
                throw new AccessDeniedException("You do not have access to this invoice.");
            }
        }
        return inv;
    }

    /**
     * Creates an invoice or merges into an existing one if a duplicate bill is scanned.
     */
    public Invoice createInvoice(Invoice invoice, String username) {
        User user = username != null ? getUser(username) : null;
        String merchantId = user != null ? user.getMerchantId() : invoice.getMerchantId();

        if (merchantId != null) {
            invoice.setMerchantId(merchantId);
        }
        if (user != null) {
            invoice.setCreatedBy(user.getUsername());
        }

        // Check for existing duplicate bill for this merchant to prevent double-counting
        if (merchantId != null) {
            List<Invoice> existingMerchantInvoices = invoiceRepository.findByMerchantId(merchantId);
            Invoice duplicate = findDuplicateInvoice(invoice, existingMerchantInvoices);

            if (duplicate != null) {
                log.info("Duplicate invoice scan detected: {} (Inv#: {}, Vendor: {}). Merging into existing invoice ID: {}",
                        invoice.getId(), invoice.getInvoiceNumber(), invoice.getVendorName(), duplicate.getId());

                // Update existing record with the latest OCR/scan details instead of creating a duplicate
                duplicate.setVendorName(invoice.getVendorName());
                duplicate.setGstin(invoice.getGstin());
                if (invoice.getInvoiceNumber() != null && !invoice.getInvoiceNumber().isBlank()) {
                    duplicate.setInvoiceNumber(invoice.getInvoiceNumber());
                }
                if (invoice.getInvoiceDate() != null) {
                    duplicate.setInvoiceDate(invoice.getInvoiceDate());
                }
                if (invoice.getDueDate() != null) {
                    duplicate.setDueDate(invoice.getDueDate());
                }
                if (invoice.getCategory() != null) {
                    duplicate.setCategory(invoice.getCategory());
                }
                if (invoice.getHsnSac() != null) {
                    duplicate.setHsnSac(invoice.getHsnSac());
                }
                if (invoice.getTaxableAmount() != null) {
                    duplicate.setTaxableAmount(invoice.getTaxableAmount());
                }
                if (invoice.getGstRate() != null) {
                    duplicate.setGstRate(invoice.getGstRate());
                }
                duplicate.setCgst(invoice.getCgst());
                duplicate.setSgst(invoice.getSgst());
                duplicate.setIgst(invoice.getIgst());
                if (invoice.getTotalAmount() != null) {
                    duplicate.setTotalAmount(invoice.getTotalAmount());
                }
                if (invoice.getItcEligibility() != null) {
                    duplicate.setItcEligibility(invoice.getItcEligibility());
                }
                if (invoice.getItcAmount() != null) {
                    duplicate.setItcAmount(invoice.getItcAmount());
                }
                if (invoice.getRawFileUrl() != null && !invoice.getRawFileUrl().isBlank()) {
                    duplicate.setRawFileUrl(invoice.getRawFileUrl());
                }
                if (invoice.getNotes() != null) {
                    duplicate.setNotes(invoice.getNotes());
                }

                return invoiceRepository.save(duplicate);
            }
        }

        if (invoice.getId() == null || invoice.getId().isBlank()) {
            invoice.setId(generateInvoiceId());
        }

        return invoiceRepository.save(invoice);
    }

    public Invoice updateInvoice(String id, Invoice updated, String username) {
        Invoice existing = getInvoiceById(id, username);

        existing.setVendorName(updated.getVendorName());
        existing.setGstin(updated.getGstin());
        existing.setInvoiceNumber(updated.getInvoiceNumber());
        existing.setInvoiceDate(updated.getInvoiceDate());
        existing.setDueDate(updated.getDueDate());
        existing.setCategory(updated.getCategory());
        existing.setHsnSac(updated.getHsnSac());
        existing.setTaxableAmount(updated.getTaxableAmount());
        existing.setGstRate(updated.getGstRate());
        existing.setCgst(updated.getCgst());
        existing.setSgst(updated.getSgst());
        existing.setIgst(updated.getIgst());
        existing.setTotalAmount(updated.getTotalAmount());
        existing.setItcEligibility(updated.getItcEligibility());
        existing.setItcAmount(updated.getItcAmount());
        existing.setRcmApplicable(updated.isRcmApplicable());
        existing.setStatus(updated.getStatus());
        existing.setPaymentStatus(updated.getPaymentStatus());
        existing.setOcrConfidence(updated.getOcrConfidence());
        existing.setNotes(updated.getNotes());
        existing.setRawFileUrl(updated.getRawFileUrl());

        return invoiceRepository.save(existing);
    }

    public Invoice updateStatus(String id, String status, String paymentStatus, String username) {
        Invoice existing = getInvoiceById(id, username);
        if (status != null) existing.setStatus(status);
        if (paymentStatus != null) existing.setPaymentStatus(paymentStatus);
        return invoiceRepository.save(existing);
    }

    public void deleteInvoice(String id, String username) {
        Invoice existing = getInvoiceById(id, username);
        invoiceRepository.deleteById(existing.getId());
    }

    /**
     * Scans and removes any existing duplicate bills for the calling merchant.
     */
    public Map<String, Object> deduplicateInvoices(String username) {
        User user = getUser(username);
        String merchantId = user.getMerchantId();

        List<Invoice> invoices = (user.getRole() == Role.SUPER_ADMIN || merchantId == null)
                ? invoiceRepository.findAll()
                : invoiceRepository.findByMerchantId(merchantId);

        int totalBefore = invoices.size();
        Set<String> seenKeys = new HashSet<>();
        List<String> toDeleteIds = new ArrayList<>();

        for (Invoice inv : invoices) {
            String invNumKey = (inv.getInvoiceNumber() != null ? inv.getInvoiceNumber().trim().toLowerCase() : "");
            String gstinKey = (inv.getGstin() != null ? inv.getGstin().trim().toUpperCase() : "");
            String vendorKey = (inv.getVendorName() != null ? inv.getVendorName().trim().toLowerCase() : "");
            String dateKey = (inv.getInvoiceDate() != null ? inv.getInvoiceDate().toString() : "");
            String amountKey = (inv.getTotalAmount() != null ? inv.getTotalAmount().toPlainString() : "");

            String primaryKey = null;
            if (!invNumKey.isEmpty() && !gstinKey.isEmpty()) {
                primaryKey = "INV_GSTIN:" + invNumKey + "|" + gstinKey;
            } else if (!invNumKey.isEmpty() && !vendorKey.isEmpty()) {
                primaryKey = "INV_VENDOR:" + invNumKey + "|" + vendorKey;
            } else if (!gstinKey.isEmpty() && !amountKey.isEmpty() && !dateKey.isEmpty()) {
                primaryKey = "GSTIN_AMT_DATE:" + gstinKey + "|" + amountKey + "|" + dateKey;
            }

            if (primaryKey != null) {
                if (seenKeys.contains(primaryKey)) {
                    toDeleteIds.add(inv.getId());
                } else {
                    seenKeys.add(primaryKey);
                }
            }
        }

        for (String delId : toDeleteIds) {
            invoiceRepository.deleteById(delId);
        }

        int removedCount = toDeleteIds.size();
        int remainingCount = totalBefore - removedCount;

        log.info("Deduplication completed for user {}: removed {} duplicate bills, {} remaining",
                username, removedCount, remainingCount);

        return Map.of(
                "removedCount", removedCount,
                "remainingCount", remainingCount,
                "message", removedCount > 0
                        ? "Successfully consolidated " + removedCount + " duplicate bill(s) into single invoices."
                        : "No duplicate bills found. Ledger is already clean."
        );
    }

    public Map<String, Object> getDashboardStats(String username) {
        List<Invoice> invoices = getAllInvoices(username);

        BigDecimal totalSpend = invoices.stream()
                .map(Invoice::getTotalAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal eligibleItc = invoices.stream()
                .filter(inv -> inv.getItcEligibility() != null && inv.getItcEligibility().contains("Eligible"))
                .map(Invoice::getItcAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal blockedItc = invoices.stream()
                .filter(inv -> inv.getItcEligibility() != null && inv.getItcEligibility().contains("Ineligible"))
                .map(inv -> nz(inv.getCgst()).add(nz(inv.getSgst())).add(nz(inv.getIgst())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long pendingCount = invoices.stream().filter(i -> "Pending".equalsIgnoreCase(i.getStatus())).count();
        long flaggedCount = invoices.stream().filter(i -> "Flagged".equalsIgnoreCase(i.getStatus())).count();
        long approvedCount = invoices.stream().filter(i -> "Approved".equalsIgnoreCase(i.getStatus())).count();

        return Map.of(
                "totalInvoices", invoices.size(),
                "totalSpend", totalSpend,
                "eligibleItc", eligibleItc,
                "blockedItc", blockedItc,
                "pendingCount", pendingCount,
                "flaggedCount", flaggedCount,
                "approvedCount", approvedCount
        );
    }

    private Invoice findDuplicateInvoice(Invoice newInv, List<Invoice> existingList) {
        if (newInv == null || existingList == null || existingList.isEmpty()) {
            return null;
        }

        String newInvNo = newInv.getInvoiceNumber() != null ? newInv.getInvoiceNumber().trim().toLowerCase() : "";
        String newGstin = newInv.getGstin() != null ? newInv.getGstin().trim().toUpperCase() : "";
        String newVendor = newInv.getVendorName() != null ? newInv.getVendorName().trim().toLowerCase() : "";

        for (Invoice ex : existingList) {
            // Do not match against self if updating
            if (newInv.getId() != null && newInv.getId().equalsIgnoreCase(ex.getId())) {
                continue;
            }

            String exInvNo = ex.getInvoiceNumber() != null ? ex.getInvoiceNumber().trim().toLowerCase() : "";
            String exGstin = ex.getGstin() != null ? ex.getGstin().trim().toUpperCase() : "";
            String exVendor = ex.getVendorName() != null ? ex.getVendorName().trim().toLowerCase() : "";

            // Check 1: Matching Invoice Number and GSTIN
            if (!newInvNo.isEmpty() && !exInvNo.isEmpty() && newInvNo.equalsIgnoreCase(exInvNo)
                    && !newGstin.isEmpty() && !exGstin.isEmpty() && newGstin.equalsIgnoreCase(exGstin)) {
                return ex;
            }

            // Check 2: Matching Invoice Number and Vendor Name
            if (!newInvNo.isEmpty() && !exInvNo.isEmpty() && newInvNo.equalsIgnoreCase(exInvNo)
                    && !newVendor.isEmpty() && !exVendor.isEmpty() && newVendor.equalsIgnoreCase(exVendor)) {
                return ex;
            }

            // Check 3: Identical GSTIN, Invoice Date, and Total Amount
            if (!newGstin.isEmpty() && !exGstin.isEmpty() && newGstin.equalsIgnoreCase(exGstin)
                    && newInv.getInvoiceDate() != null && ex.getInvoiceDate() != null && newInv.getInvoiceDate().equals(ex.getInvoiceDate())
                    && newInv.getTotalAmount() != null && ex.getTotalAmount() != null && newInv.getTotalAmount().compareTo(ex.getTotalAmount()) == 0) {
                return ex;
            }
        }
        return null;
    }

    private User getUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
    }

    private BigDecimal nz(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private String generateInvoiceId() {
        int year = Year.now().getValue();
        int random = ThreadLocalRandom.current().nextInt(1000, 10000);
        String candidate = "INV-" + year + "-" + random;
        while (invoiceRepository.existsById(candidate)) {
            random = ThreadLocalRandom.current().nextInt(1000, 10000);
            candidate = "INV-" + year + "-" + random;
        }
        return candidate;
    }
}
