package com.billwise.invoice.service;

import com.billwise.common.exception.BadRequestException;
import com.billwise.common.exception.ResourceNotFoundException;
import com.billwise.invoice.entity.Invoice;
import com.billwise.invoice.entity.InvoiceDeletionRequest;
import com.billwise.invoice.repository.InvoiceDeletionRequestRepository;
import com.billwise.invoice.repository.InvoiceRepository;
import com.billwise.invoice.security.AuthenticatedUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class InvoiceDeletionRequestService {

    private final InvoiceDeletionRequestRepository requestRepository;
    private final InvoiceRepository invoiceRepository;

    public InvoiceDeletionRequest createDeletionRequest(String invoiceId, String reason, AuthenticatedUser user) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found with id: " + invoiceId));

        if (user.getMerchantId() != null && !user.getMerchantId().equals(invoice.getMerchantId())) {
            throw new BadRequestException("Invoice does not belong to your merchant organization.");
        }

        if (requestRepository.existsByInvoiceIdAndStatus(invoiceId, "PENDING")) {
            throw new BadRequestException("A pending deletion request already exists for this invoice.");
        }

        if (reason == null || reason.trim().isEmpty()) {
            throw new BadRequestException("Reason for invoice deletion request is required.");
        }

        InvoiceDeletionRequest req = new InvoiceDeletionRequest();
        req.setInvoiceId(invoice.getId());
        req.setInvoiceNumber(invoice.getInvoiceNumber());
        req.setVendorName(invoice.getVendorName());
        req.setTotalAmount(invoice.getTotalAmount());
        req.setCategory(invoice.getCategory());
        req.setMerchantId(invoice.getMerchantId());
        req.setRequestedByUsername(user.getUsername());
        req.setRequestedByName(user.getUsername());
        req.setRequesterRole(user.getRole() != null ? user.getRole() : "ACCOUNTANT");
        req.setReason(reason.trim());
        req.setStatus("PENDING");
        req.setCreatedAt(Instant.now());

        return requestRepository.save(req);
    }

    public List<InvoiceDeletionRequest> getDeletionRequests(AuthenticatedUser user, String status) {
        boolean isSuperAdmin = "SUPER_ADMIN".equalsIgnoreCase(user.getRole());
        boolean isAdmin = "ADMIN".equalsIgnoreCase(user.getRole());

        if (isSuperAdmin) {
            return status != null 
                ? requestRepository.findByStatusOrderByCreatedAtDesc(status.toUpperCase()) 
                : requestRepository.findAllByOrderByCreatedAtDesc();
        }

        if (isAdmin) {
            String merchantId = user.getMerchantId();
            if (merchantId == null) return List.of();
            return status != null 
                ? requestRepository.findByMerchantIdAndStatusOrderByCreatedAtDesc(merchantId, status.toUpperCase())
                : requestRepository.findByMerchantIdOrderByCreatedAtDesc(merchantId);
        }

        // Accountant sees their submitted requests
        return requestRepository.findByRequestedByUsernameOrderByCreatedAtDesc(user.getUsername());
    }

    public InvoiceDeletionRequest approveDeletionRequest(String requestId, String reviewRemarks, AuthenticatedUser adminUser) {
        InvoiceDeletionRequest req = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Deletion request not found with id: " + requestId));

        if (!"PENDING".equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Deletion request is already " + req.getStatus());
        }

        if (!"SUPER_ADMIN".equalsIgnoreCase(adminUser.getRole())) {
            if (adminUser.getMerchantId() == null || !adminUser.getMerchantId().equals(req.getMerchantId())) {
                throw new BadRequestException("Deletion request does not belong to your merchant organization.");
            }
        }

        // 1. Delete the actual invoice
        if (invoiceRepository.existsById(req.getInvoiceId())) {
            invoiceRepository.deleteById(req.getInvoiceId());
        }

        // 2. Mark request as APPROVED
        req.setStatus("APPROVED");
        req.setReviewedBy(adminUser.getUsername());
        req.setReviewRemarks(reviewRemarks != null ? reviewRemarks.trim() : "Approved by administrator.");
        req.setReviewedAt(Instant.now());

        return requestRepository.save(req);
    }

    public InvoiceDeletionRequest rejectDeletionRequest(String requestId, String reviewRemarks, AuthenticatedUser adminUser) {
        InvoiceDeletionRequest req = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Deletion request not found with id: " + requestId));

        if (!"PENDING".equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Deletion request is already " + req.getStatus());
        }

        if (!"SUPER_ADMIN".equalsIgnoreCase(adminUser.getRole())) {
            if (adminUser.getMerchantId() == null || !adminUser.getMerchantId().equals(req.getMerchantId())) {
                throw new BadRequestException("Deletion request does not belong to your merchant organization.");
            }
        }

        // Mark request as REJECTED
        req.setStatus("REJECTED");
        req.setReviewedBy(adminUser.getUsername());
        req.setReviewRemarks(reviewRemarks != null ? reviewRemarks.trim() : "Rejected by administrator.");
        req.setReviewedAt(Instant.now());

        return requestRepository.save(req);
    }
}
