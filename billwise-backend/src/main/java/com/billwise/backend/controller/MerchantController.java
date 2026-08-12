package com.billwise.backend.controller;

import com.billwise.backend.dto.*;
import com.billwise.backend.entity.MerchantStatus;
import com.billwise.backend.entity.VerificationLog;
import com.billwise.backend.service.MerchantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/merchants")
@RequiredArgsConstructor
public class MerchantController {

    private final MerchantService merchantService;

    /**
     * Public self-service merchant registration.
     */
    @PostMapping("/signup")
    public ResponseEntity<MerchantResponse> signup(@Valid @RequestBody MerchantSignupRequest request) {
        MerchantResponse response = merchantService.signup(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Resubmit updated details/documents after a rejection or review request.
     */
    @PostMapping("/{id}/resubmit")
    public ResponseEntity<MerchantResponse> resubmit(
            @PathVariable("id") String id,
            @RequestBody MerchantResubmitRequest request,
            Principal principal) {
        MerchantResponse response = merchantService.resubmit(id, request, principal.getName());
        return ResponseEntity.ok(response);
    }

    /**
     * SUPER_ADMIN: Get list of all merchants awaiting verification.
     */
    @GetMapping("/pending")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<MerchantResponse>> getPendingVerifications() {
        return ResponseEntity.ok(merchantService.getPendingVerifications());
    }

    /**
     * SUPER_ADMIN: Get all merchants directory with optional status filtering.
     */
    @GetMapping("/all")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<MerchantResponse>> getAllMerchants(
            @RequestParam(name = "status", required = false) MerchantStatus status) {
        return ResponseEntity.ok(merchantService.getAllMerchants(status));
    }

    /**
     * SUPER_ADMIN: Approve a merchant.
     */
    @PostMapping("/{id}/approve")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<MerchantResponse> approveMerchant(
            @PathVariable("id") String id,
            @RequestBody(required = false) MerchantApprovalRequest request,
            Principal principal) {
        MerchantResponse response = merchantService.approveMerchant(id, request, principal.getName());
        return ResponseEntity.ok(response);
    }

    /**
     * SUPER_ADMIN: Reject a merchant with a reason.
     */
    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<MerchantResponse> rejectMerchant(
            @PathVariable("id") String id,
            @RequestBody MerchantApprovalRequest request,
            Principal principal) {
        MerchantResponse response = merchantService.rejectMerchant(id, request, principal.getName());
        return ResponseEntity.ok(response);
    }

    /**
     * SUPER_ADMIN: Suspend an active merchant.
     */
    @PostMapping("/{id}/suspend")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<MerchantResponse> suspendMerchant(
            @PathVariable("id") String id,
            @RequestBody(required = false) MerchantApprovalRequest request,
            Principal principal) {
        MerchantResponse response = merchantService.suspendMerchant(id, request, principal.getName());
        return ResponseEntity.ok(response);
    }

    /**
     * SUPER_ADMIN: View verification audit trail logs for a merchant.
     */
    @GetMapping("/{id}/logs")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<VerificationLog>> getVerificationLogs(@PathVariable("id") String id) {
        return ResponseEntity.ok(merchantService.getVerificationLogs(id));
    }

    /**
     * Get logged-in admin's merchant business profile.
     */
    @GetMapping("/my-business")
    public ResponseEntity<MerchantResponse> getMyBusiness(Principal principal) {
        MerchantResponse response = merchantService.getMyBusiness(principal.getName());
        return ResponseEntity.ok(response);
    }

    /**
     * Merchant Admin: Update business profile details (GSTIN & legal name locked).
     */
    @PutMapping("/my-business")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<MerchantResponse> updateMyBusiness(
            Principal principal,
            @RequestBody UpdateBusinessRequest request) {
        MerchantResponse response = merchantService.updateMyBusiness(principal.getName(), request);
        return ResponseEntity.ok(response);
    }

    /**
     * Merchant Admin: List staff users (Accountants & Viewers).
     */
    @GetMapping("/staff")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<List<StaffUserResponse>> getStaff(Principal principal) {
        return ResponseEntity.ok(merchantService.getStaff(principal.getName()));
    }

    /**
     * Merchant Admin: Create a new staff account.
     */
    @PostMapping("/staff")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<StaffUserResponse> createStaff(
            Principal principal,
            @Valid @RequestBody CreateStaffRequest request) {
        StaffUserResponse response = merchantService.createStaff(principal.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Merchant Admin: Enable or disable a staff member.
     */
    @PatchMapping("/staff/{staffUserId}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<StaffUserResponse> toggleStaffStatus(
            @PathVariable("staffUserId") String staffUserId,
            @RequestBody Map<String, Boolean> payload,
            Principal principal) {
        boolean enabled = payload.getOrDefault("enabled", true);
        StaffUserResponse response = merchantService.toggleStaffStatus(principal.getName(), staffUserId, enabled);
        return ResponseEntity.ok(response);
    }
}
