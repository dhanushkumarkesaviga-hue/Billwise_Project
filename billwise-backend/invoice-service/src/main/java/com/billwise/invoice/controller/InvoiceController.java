package com.billwise.invoice.controller;

import com.billwise.invoice.dto.InvoiceDtos.ClassifyRequest;
import com.billwise.invoice.dto.InvoiceDtos.ClassifyResponse;
import com.billwise.invoice.entity.Invoice;
import com.billwise.invoice.security.AuthenticatedUser;
import com.billwise.invoice.service.InvoiceClassificationService;
import com.billwise.invoice.service.InvoiceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;
    private final InvoiceClassificationService classificationService;
    private final com.billwise.invoice.service.InvoiceDeletionRequestService deletionRequestService;

    @GetMapping
    public List<Invoice> getAllInvoices(@AuthenticationPrincipal AuthenticatedUser user) {
        return invoiceService.getAllInvoices(user);
    }

    @GetMapping("/{id}")
    public Invoice getInvoice(@PathVariable("id") String id, @AuthenticationPrincipal AuthenticatedUser user) {
        return invoiceService.getInvoiceById(id, user);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN')")
    @PostMapping
    public ResponseEntity<Invoice> createInvoice(@Valid @RequestBody Invoice invoice, @AuthenticationPrincipal AuthenticatedUser user) {
        Invoice saved = invoiceService.createInvoice(invoice, user);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN')")
    @PutMapping("/{id}")
    public Invoice updateInvoice(@PathVariable("id") String id, @Valid @RequestBody Invoice invoice, @AuthenticationPrincipal AuthenticatedUser user) {
        return invoiceService.updateInvoice(id, invoice, user);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN')")
    @PatchMapping("/{id}/status")
    public Invoice updateStatus(@PathVariable("id") String id, @RequestBody Map<String, String> body, @AuthenticationPrincipal AuthenticatedUser user) {
        return invoiceService.updateStatus(id, body.get("status"), body.get("paymentStatus"), user);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteInvoice(@PathVariable("id") String id, @AuthenticationPrincipal AuthenticatedUser user) {
        invoiceService.deleteInvoice(id, user);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAnyRole('ACCOUNTANT', 'ADMIN', 'SUPER_ADMIN')")
    @PostMapping("/{id}/deletion-requests")
    public ResponseEntity<com.billwise.invoice.entity.InvoiceDeletionRequest> requestInvoiceDeletion(
            @PathVariable("id") String id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        String reason = body.getOrDefault("reason", "Accountant requested invoice deletion.");
        com.billwise.invoice.entity.InvoiceDeletionRequest req = deletionRequestService.createDeletionRequest(id, reason, user);
        return ResponseEntity.status(HttpStatus.CREATED).body(req);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT')")
    @GetMapping("/deletion-requests")
    public List<com.billwise.invoice.entity.InvoiceDeletionRequest> getDeletionRequests(
            @RequestParam(value = "status", required = false) String status,
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        return deletionRequestService.getDeletionRequests(user, status);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @PostMapping("/deletion-requests/{requestId}/approve")
    public ResponseEntity<com.billwise.invoice.entity.InvoiceDeletionRequest> approveDeletionRequest(
            @PathVariable("requestId") String requestId,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        String remarks = body != null ? body.get("reviewRemarks") : "Approved by administrator.";
        com.billwise.invoice.entity.InvoiceDeletionRequest approved = deletionRequestService.approveDeletionRequest(requestId, remarks, user);
        return ResponseEntity.ok(approved);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @PostMapping("/deletion-requests/{requestId}/reject")
    public ResponseEntity<com.billwise.invoice.entity.InvoiceDeletionRequest> rejectDeletionRequest(
            @PathVariable("requestId") String requestId,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        String remarks = body != null ? body.get("reviewRemarks") : "Rejected by administrator.";
        com.billwise.invoice.entity.InvoiceDeletionRequest rejected = deletionRequestService.rejectDeletionRequest(requestId, remarks, user);
        return ResponseEntity.ok(rejected);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN')")
    @PostMapping("/deduplicate")
    public ResponseEntity<Map<String, Object>> deduplicateInvoices(@AuthenticationPrincipal AuthenticatedUser user) {
        Map<String, Object> result = invoiceService.deduplicateInvoices(user);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/stats")
    public Map<String, Object> getDashboardStats(@AuthenticationPrincipal AuthenticatedUser user) {
        return invoiceService.getDashboardStats(user);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN')")
    @PostMapping("/classify")
    public ClassifyResponse classify(@Valid @RequestBody ClassifyRequest request) {
        return classificationService.classify(request.getOcrText(), request.getVendorNameHint());
    }
}
