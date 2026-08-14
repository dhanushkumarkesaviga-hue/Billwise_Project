package com.billwise.backend.controller;

import com.billwise.backend.dto.ClassifyRequest;
import com.billwise.backend.dto.ClassifyResponse;
import com.billwise.backend.entity.Invoice;
import com.billwise.backend.service.InvoiceClassificationService;
import com.billwise.backend.service.InvoiceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.billwise.backend.dto.VlmExtractionRequest;
import com.billwise.backend.dto.VlmExtractionResponse;
import com.billwise.backend.service.OllamaVisionService;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;
    private final InvoiceClassificationService classificationService;
    private final OllamaVisionService ollamaVisionService;

    // Any authenticated role can read invoices for their merchant
    @GetMapping
    public List<Invoice> getAllInvoices(Principal principal) {
        return invoiceService.getAllInvoices(principal.getName());
    }

    @GetMapping("/{id}")
    public Invoice getInvoice(@PathVariable("id") String id, Principal principal) {
        return invoiceService.getInvoiceById(id, principal.getName());
    }

    // VIEWER accounts are read-only and cannot create records.
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN')")
    @PostMapping
    public ResponseEntity<Invoice> createInvoice(@Valid @RequestBody Invoice invoice, Principal principal) {
        Invoice saved = invoiceService.createInvoice(invoice, principal.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN')")
    @PutMapping("/{id}")
    public Invoice updateInvoice(@PathVariable("id") String id, @Valid @RequestBody Invoice invoice, Principal principal) {
        return invoiceService.updateInvoice(id, invoice, principal.getName());
    }

    // Quick-action endpoint for buttons like "Approve", "Flag", "Mark as Paid"
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN')")
    @PatchMapping("/{id}/status")
    public Invoice updateStatus(@PathVariable("id") String id, @RequestBody Map<String, String> body, Principal principal) {
        return invoiceService.updateStatus(id, body.get("status"), body.get("paymentStatus"), principal.getName());
    }

    // Deleting records is admin-only.
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteInvoice(@PathVariable("id") String id, Principal principal) {
        invoiceService.deleteInvoice(id, principal.getName());
        return ResponseEntity.noContent().build();
    }

    // Deduplicate / Clean up duplicate bills for the merchant
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN')")
    @PostMapping("/deduplicate")
    public ResponseEntity<Map<String, Object>> deduplicateInvoices(Principal principal) {
        Map<String, Object> result = invoiceService.deduplicateInvoices(principal.getName());
        return ResponseEntity.ok(result);
    }

    @GetMapping({"/stats", "/summary"})
    public Map<String, Object> getDashboardStats(Principal principal) {
        return invoiceService.getDashboardStats(principal.getName());
    }

    // AI-powered category classification
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN')")
    @PostMapping("/classify")
    public ClassifyResponse classify(@Valid @RequestBody ClassifyRequest request) {
        return classificationService.classify(request.getOcrText(), request.getVendorNameHint());
    }

    // Vision-Language Model invoice extraction
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN')")
    @PostMapping("/extract-vlm")
    public ResponseEntity<VlmExtractionResponse> extractVlm(@Valid @RequestBody VlmExtractionRequest request) {
        VlmExtractionResponse response = ollamaVisionService.extractInvoice(request);
        return ResponseEntity.ok(response);
    }
}
