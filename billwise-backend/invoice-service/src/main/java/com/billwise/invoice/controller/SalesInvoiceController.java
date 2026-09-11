package com.billwise.invoice.controller;

import com.billwise.invoice.dto.SalesInvoiceDtos.Gstr1ReportDto;
import com.billwise.invoice.dto.SalesInvoiceDtos.Gstr3bSummaryDto;
import com.billwise.invoice.dto.SalesInvoiceDtos.SalesInvoiceStatsDto;
import com.billwise.invoice.entity.SalesInvoice;
import com.billwise.invoice.security.AuthenticatedUser;
import com.billwise.invoice.service.GstrSummaryService;
import com.billwise.invoice.service.SalesInvoiceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/sales-invoices")
@RequiredArgsConstructor
public class SalesInvoiceController {

    private final SalesInvoiceService salesInvoiceService;
    private final GstrSummaryService gstrSummaryService;

    @GetMapping
    public List<SalesInvoice> getAllSalesInvoices(
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "supplyType", required = false) String supplyType,
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        return salesInvoiceService.getAllSalesInvoices(user, from, to, status, supplyType);
    }

    @GetMapping("/{id}")
    public SalesInvoice getSalesInvoice(
            @PathVariable("id") String id,
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        return salesInvoiceService.getSalesInvoiceById(id, user);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN')")
    @PostMapping
    public ResponseEntity<SalesInvoice> createSalesInvoice(
            @Valid @RequestBody SalesInvoice salesInvoice,
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        SalesInvoice created = salesInvoiceService.createSalesInvoice(salesInvoice, user);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN')")
    @PutMapping("/{id}")
    public SalesInvoice updateSalesInvoice(
            @PathVariable("id") String id,
            @Valid @RequestBody SalesInvoice salesInvoice,
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        return salesInvoiceService.updateSalesInvoice(id, salesInvoice, user);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSalesInvoice(
            @PathVariable("id") String id,
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        salesInvoiceService.deleteSalesInvoice(id, user);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/stats")
    public SalesInvoiceStatsDto getStats(@AuthenticationPrincipal AuthenticatedUser user) {
        return salesInvoiceService.getSalesStats(user);
    }

    @GetMapping("/gstr3b-summary")
    public Gstr3bSummaryDto getGstr3bSummary(
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        String merchantId = (user != null && !user.isSuperAdmin()) ? user.getMerchantId() : null;
        return gstrSummaryService.calculateNetLiability(merchantId, from, to);
    }

    @GetMapping("/gstr1-summary")
    public Gstr1ReportDto getGstr1Summary(
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        String merchantId = (user != null && !user.isSuperAdmin()) ? user.getMerchantId() : null;
        return gstrSummaryService.generateGstr1Report(merchantId, from, to);
    }
}
