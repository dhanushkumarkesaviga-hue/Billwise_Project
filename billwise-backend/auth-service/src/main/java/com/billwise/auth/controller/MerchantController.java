package com.billwise.auth.controller;

import com.billwise.auth.dto.AuthDtos.AuthResponse;
import com.billwise.auth.dto.AuthDtos.PasswordResetDto;
import com.billwise.auth.dto.AuthDtos.PasswordResetActionRequest;
import com.billwise.auth.dto.MerchantDtos.MerchantSignupRequest;
import com.billwise.auth.dto.MerchantDtos.StaffCreateRequest;
import com.billwise.auth.dto.MerchantDtos.VerificationActionRequest;
import com.billwise.auth.dto.UserDtos.StaffUserDto;
import com.billwise.auth.entity.Merchant;
import com.billwise.auth.entity.VerificationLog;
import com.billwise.auth.security.UserPrincipal;
import com.billwise.auth.service.MerchantService;
import com.billwise.common.entity.MerchantStatus;
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
@RequestMapping("/api/merchants")
@RequiredArgsConstructor
public class MerchantController {

    private final MerchantService merchantService;

    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signupMerchant(@Valid @RequestBody MerchantSignupRequest request) {
        AuthResponse response = merchantService.signupMerchant(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/{id}/resubmit")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Merchant> resubmitVerification(
            @PathVariable("id") String merchantId,
            @Valid @RequestBody MerchantSignupRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Merchant merchant = merchantService.resubmitVerification(merchantId, request, principal.getUsername());
        return ResponseEntity.ok(merchant);
    }

    @GetMapping("/pending")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<Merchant>> getPendingMerchants() {
        return ResponseEntity.ok(merchantService.getPendingMerchants());
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<Merchant>> getAllMerchants(
            @RequestParam(value = "status", required = false) MerchantStatus status
    ) {
        return ResponseEntity.ok(merchantService.getAllMerchants(status));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Merchant> getMerchantById(@PathVariable("id") String id) {
        return ResponseEntity.ok(merchantService.getMerchantById(id));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Merchant> approveMerchant(
            @PathVariable("id") String merchantId,
            @RequestBody(required = false) VerificationActionRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String reason = request != null ? request.getReason() : null;
        Merchant approved = merchantService.approveMerchant(merchantId, principal.getUsername(), reason);
        return ResponseEntity.ok(approved);
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Merchant> rejectMerchant(
            @PathVariable("id") String merchantId,
            @RequestBody VerificationActionRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String reason = request != null ? request.getReason() : "Documentation not verified.";
        Merchant rejected = merchantService.rejectMerchant(merchantId, principal.getUsername(), reason);
        return ResponseEntity.ok(rejected);
    }

    @PostMapping("/{id}/suspend")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Merchant> suspendMerchant(
            @PathVariable("id") String merchantId,
            @RequestBody(required = false) VerificationActionRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String reason = request != null ? request.getReason() : null;
        Merchant suspended = merchantService.suspendMerchant(merchantId, principal.getUsername(), reason);
        return ResponseEntity.ok(suspended);
    }

    @GetMapping("/{id}/logs")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<List<VerificationLog>> getVerificationLogs(@PathVariable("id") String merchantId) {
        return ResponseEntity.ok(merchantService.getVerificationLogs(merchantId));
    }

    @GetMapping("/my-business")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTANT', 'VIEWER')")
    public ResponseEntity<Merchant> getMyBusinessDetails(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal.getMerchantId() == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(merchantService.getMerchantById(principal.getMerchantId()));
    }

    @PutMapping("/my-business")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Merchant> updateMyBusinessDetails(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Merchant details
    ) {
        Merchant m = merchantService.getMerchantById(principal.getMerchantId());
        if (details.getContactEmail() != null) m.setContactEmail(details.getContactEmail());
        if (details.getContactPhone() != null) m.setContactPhone(details.getContactPhone());
        if (details.getRegisteredAddress() != null) m.setRegisteredAddress(details.getRegisteredAddress());
        if (details.getPincode() != null) m.setPincode(details.getPincode());
        return ResponseEntity.ok(m);
    }

    @PostMapping("/staff")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<StaffUserDto> createStaffUser(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody StaffCreateRequest request
    ) {
        StaffUserDto staff = merchantService.createStaffUser(principal.getMerchantId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(staff);
    }

    @GetMapping("/staff")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<StaffUserDto>> getStaffUsers(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(merchantService.getStaffUsers(principal.getMerchantId()));
    }

    @PatchMapping("/staff/{staffUserId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<StaffUserDto> toggleStaffStatus(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("staffUserId") String staffUserId,
            @RequestBody Map<String, Boolean> body
    ) {
        boolean enabled = body.getOrDefault("enabled", true);
        return ResponseEntity.ok(merchantService.toggleStaffStatus(principal.getMerchantId(), staffUserId, enabled));
    }

    @PatchMapping("/staff/{staffUserId}/verify")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<StaffUserDto> verifyStaffUser(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("staffUserId") String staffUserId,
            @RequestBody Map<String, Boolean> body
    ) {
        boolean verified = body.getOrDefault("verified", true);
        return ResponseEntity.ok(merchantService.verifyStaffUser(principal.getMerchantId(), staffUserId, verified, principal.getUsername()));
    }

    @DeleteMapping("/staff/{staffUserId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteStaffUser(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("staffUserId") String staffUserId
    ) {
        merchantService.deleteStaffUser(principal.getMerchantId(), staffUserId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/password-resets/pending")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<List<PasswordResetDto>> getPendingPasswordResets(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(merchantService.getPendingPasswordResets(principal.getMerchantId(), principal.getUsername()));
    }

    @GetMapping("/password-resets/all")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<List<PasswordResetDto>> getAllPasswordResets(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(merchantService.getAllPasswordResets(principal.getMerchantId(), principal.getUsername()));
    }

    @PostMapping("/password-resets/{requestId}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<PasswordResetDto> approvePasswordReset(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("requestId") String requestId,
            @RequestBody(required = false) PasswordResetActionRequest body
    ) {
        String note = body != null ? body.getNote() : null;
        return ResponseEntity.ok(merchantService.approvePasswordReset(principal.getMerchantId(), requestId, principal.getUsername(), note));
    }

    @PostMapping("/password-resets/{requestId}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<PasswordResetDto> rejectPasswordReset(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("requestId") String requestId,
            @RequestBody(required = false) PasswordResetActionRequest body
    ) {
        String reason = body != null ? body.getNote() : "Rejected by Admin";
        return ResponseEntity.ok(merchantService.rejectPasswordReset(principal.getMerchantId(), requestId, principal.getUsername(), reason));
    }
}

