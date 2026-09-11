package com.billwise.backend.controller;

import com.billwise.backend.dto.SalesInvoiceDtos.Gstr1ReportDto;
import com.billwise.backend.dto.SalesInvoiceDtos.Gstr3bSummaryDto;
import com.billwise.backend.dto.SalesInvoiceDtos.SalesInvoiceStatsDto;
import com.billwise.backend.entity.SalesInvoice;
import com.billwise.backend.service.GstrSummaryService;
import com.billwise.backend.service.SalesInvoiceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
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
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        return salesInvoiceService.getAllSalesInvoices(username, from, to, status, supplyType);
    }

    @GetMapping("/{id}")
    public SalesInvoice getSalesInvoice(
            @PathVariable("id") String id,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        return salesInvoiceService.getSalesInvoiceById(id, username);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN')")
    @PostMapping
    public ResponseEntity<SalesInvoice> createSalesInvoice(
            @Valid @RequestBody SalesInvoice salesInvoice,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        SalesInvoice created = salesInvoiceService.createSalesInvoice(salesInvoice, username);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN')")
    @PutMapping("/{id}")
    public SalesInvoice updateSalesInvoice(
            @PathVariable("id") String id,
            @Valid @RequestBody SalesInvoice salesInvoice,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        return salesInvoiceService.updateSalesInvoice(id, salesInvoice, username);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSalesInvoice(
            @PathVariable("id") String id,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        salesInvoiceService.deleteSalesInvoice(id, username);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/stats")
    public SalesInvoiceStatsDto getStats(Principal principal) {
        String username = principal != null ? principal.getName() : null;
        return salesInvoiceService.getSalesStats(username);
    }

    @GetMapping("/gstr3b-summary")
    public Gstr3bSummaryDto getGstr3bSummary(
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        String merchantId = salesInvoiceService.resolveMerchantId(username);
        return gstrSummaryService.calculateNetLiability(merchantId, from, to);
    }

    @GetMapping("/gstr1-summary")
    public Gstr1ReportDto getGstr1Summary(
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        String merchantId = salesInvoiceService.resolveMerchantId(username);
        return gstrSummaryService.generateGstr1Report(merchantId, from, to);
    }
}
