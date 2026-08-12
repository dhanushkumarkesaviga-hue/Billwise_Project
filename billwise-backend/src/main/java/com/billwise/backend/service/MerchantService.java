package com.billwise.backend.service;

import com.billwise.backend.dto.*;
import com.billwise.backend.entity.*;
import com.billwise.backend.exception.BadRequestException;
import com.billwise.backend.exception.ResourceNotFoundException;
import com.billwise.backend.repository.MerchantRepository;
import com.billwise.backend.repository.UserRepository;
import com.billwise.backend.repository.VerificationLogRepository;
import com.billwise.backend.security.GstValidationUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MerchantService {

    private final MerchantRepository merchantRepository;
    private final UserRepository userRepository;
    private final VerificationLogRepository verificationLogRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Public self-service merchant signup.
     */
    public MerchantResponse signup(MerchantSignupRequest req) {
        String cleanGstin = req.getGstin() != null ? req.getGstin().trim().toUpperCase() : "";

        // 1. Strict GSTIN structure and Mod-36 checksum verification
        if (!GstValidationUtil.isValidGstin(cleanGstin)) {
            throw new BadRequestException("Invalid GSTIN: format or Mod-36 checksum verification failed. Please ensure the 15-character GSTIN is valid.");
        }

        // 2. Enforce database uniqueness on GSTIN
        if (merchantRepository.existsByGstin(cleanGstin)) {
            throw new BadRequestException("A merchant with GSTIN " + cleanGstin + " is already registered.");
        }

        // 3. Check user uniqueness
        if (userRepository.existsByUsername(req.getAdminUsername())) {
            throw new BadRequestException("Username '" + req.getAdminUsername() + "' is already taken.");
        }
        if (userRepository.existsByEmail(req.getContactEmail())) {
            throw new BadRequestException("Email '" + req.getContactEmail() + "' is already in use.");
        }

        // 4. Extract PAN and State info
        String pan = GstValidationUtil.extractPan(cleanGstin);
        String stateCode = cleanGstin.substring(0, 2);
        String stateName = req.getState() != null && !req.getState().isBlank()
                ? req.getState()
                : GstValidationUtil.getStateName(stateCode);

        // 5. Fraud/Similarity Review Signals
        List<String> warningFlags = new ArrayList<>();
        if (merchantRepository.existsByPan(pan)) {
            warningFlags.add("PAN " + pan + " is already associated with another registered merchant");
        }
        List<Merchant> phoneMatches = merchantRepository.findByContactPhone(req.getContactPhone());
        if (!phoneMatches.isEmpty()) {
            warningFlags.add("Phone number matches " + phoneMatches.size() + " existing merchant record(s)");
        }
        List<Merchant> emailMatches = merchantRepository.findByContactEmail(req.getContactEmail());
        if (!emailMatches.isEmpty()) {
            warningFlags.add("Email address matches " + emailMatches.size() + " existing merchant record(s)");
        }

        // 6. Persist Merchant in PENDING_VERIFICATION state
        Merchant merchant = new Merchant();
        merchant.setLegalName(req.getLegalName().trim());
        merchant.setTradeName(req.getTradeName().trim());
        merchant.setGstin(cleanGstin);
        merchant.setPan(pan);
        merchant.setBusinessType(req.getBusinessType() != null ? req.getBusinessType().trim() : "Proprietorship");
        merchant.setRegisteredAddress(req.getRegisteredAddress().trim());
        merchant.setState(stateName);
        merchant.setStateCode(stateCode);
        merchant.setPincode(req.getPincode() != null ? req.getPincode().trim() : "");
        merchant.setContactEmail(req.getContactEmail().trim());
        merchant.setContactPhone(req.getContactPhone().trim());
        merchant.setGstCertificateUrl(req.getGstCertificateUrl());
        merchant.setShopLicenseUrl(req.getShopLicenseUrl());
        merchant.setStorefrontPhotoUrl(req.getStorefrontPhotoUrl());
        merchant.setStatus(MerchantStatus.PENDING_VERIFICATION);
        merchant.setDuplicateWarningFlags(warningFlags);
        merchant.setAdminUsername(req.getAdminUsername().trim());
        merchant.setCreatedAt(Instant.now());
        merchant.setUpdatedAt(Instant.now());

        Merchant savedMerchant = merchantRepository.save(merchant);

        // 7. Persist Owner Admin User linked to this Merchant
        User adminUser = new User();
        adminUser.setUsername(req.getAdminUsername().trim());
        adminUser.setFullName(req.getAdminFullName().trim());
        adminUser.setEmail(req.getContactEmail().trim());
        adminUser.setPhone(req.getContactPhone().trim());
        adminUser.setPassword(passwordEncoder.encode(req.getAdminPassword()));
        adminUser.setRole(Role.ADMIN);
        adminUser.setMerchantId(savedMerchant.getId());
        adminUser.setEnabled(true);
        adminUser.setCreatedAt(Instant.now());
        adminUser.setUpdatedAt(Instant.now());
        userRepository.save(adminUser);

        // 8. Log initial verification submission event
        VerificationLog logEntry = new VerificationLog();
        logEntry.setMerchantId(savedMerchant.getId());
        logEntry.setAction("SUBMITTED");
        logEntry.setPerformedBy(req.getAdminUsername());
        logEntry.setReason("Merchant submitted self-service registration and documents.");
        logEntry.setTimestamp(Instant.now());
        verificationLogRepository.save(logEntry);

        log.info("Merchant signup successful: {} (GSTIN: {}) - Status: PENDING_VERIFICATION", savedMerchant.getTradeName(), cleanGstin);
        return MerchantResponse.fromEntity(savedMerchant);
    }

    /**
     * Resubmit documents and details for a rejected or pending merchant.
     */
    public MerchantResponse resubmit(String merchantId, MerchantResubmitRequest req, String username) {
        Merchant merchant = merchantRepository.findById(merchantId)
                .orElseThrow(() -> new ResourceNotFoundException("Merchant not found"));

        // Verify caller is the admin of this merchant or SUPER_ADMIN
        User caller = userRepository.findByUsername(username)
                .orElseThrow(() -> new BadRequestException("User not found"));
        if (caller.getRole() != Role.SUPER_ADMIN && !merchantId.equals(caller.getMerchantId())) {
            throw new BadRequestException("You do not have permission to resubmit for this merchant.");
        }

        if (req.getTradeName() != null && !req.getTradeName().isBlank()) merchant.setTradeName(req.getTradeName().trim());
        if (req.getBusinessType() != null && !req.getBusinessType().isBlank()) merchant.setBusinessType(req.getBusinessType().trim());
        if (req.getRegisteredAddress() != null && !req.getRegisteredAddress().isBlank()) merchant.setRegisteredAddress(req.getRegisteredAddress().trim());
        if (req.getState() != null && !req.getState().isBlank()) merchant.setState(req.getState().trim());
        if (req.getPincode() != null && !req.getPincode().isBlank()) merchant.setPincode(req.getPincode().trim());
        if (req.getContactEmail() != null && !req.getContactEmail().isBlank()) merchant.setContactEmail(req.getContactEmail().trim());
        if (req.getContactPhone() != null && !req.getContactPhone().isBlank()) merchant.setContactPhone(req.getContactPhone().trim());

        if (req.getGstCertificateUrl() != null && !req.getGstCertificateUrl().isBlank()) {
            merchant.setGstCertificateUrl(req.getGstCertificateUrl());
        }
        if (req.getShopLicenseUrl() != null && !req.getShopLicenseUrl().isBlank()) {
            merchant.setShopLicenseUrl(req.getShopLicenseUrl());
        }
        if (req.getStorefrontPhotoUrl() != null && !req.getStorefrontPhotoUrl().isBlank()) {
            merchant.setStorefrontPhotoUrl(req.getStorefrontPhotoUrl());
        }

        merchant.setStatus(MerchantStatus.PENDING_VERIFICATION);
        merchant.setRejectionReason(null);
        merchant.setUpdatedAt(Instant.now());
        Merchant saved = merchantRepository.save(merchant);

        VerificationLog logEntry = new VerificationLog();
        logEntry.setMerchantId(saved.getId());
        logEntry.setAction("RESUBMITTED");
        logEntry.setPerformedBy(username);
        logEntry.setReason(req.getResubmitNotes() != null ? req.getResubmitNotes() : "Updated documents & details resubmitted for verification.");
        logEntry.setTimestamp(Instant.now());
        verificationLogRepository.save(logEntry);

        log.info("Merchant {} resubmitted verification request.", saved.getTradeName());
        return MerchantResponse.fromEntity(saved);
    }

    /**
     * SUPER_ADMIN: List all merchants waiting for verification.
     */
    public List<MerchantResponse> getPendingVerifications() {
        return merchantRepository.findByStatusOrderByCreatedAtDesc(MerchantStatus.PENDING_VERIFICATION)
                .stream()
                .map(MerchantResponse::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * SUPER_ADMIN: List all merchants, optionally filtered by status.
     */
    public List<MerchantResponse> getAllMerchants(MerchantStatus status) {
        List<Merchant> list = (status != null)
                ? merchantRepository.findByStatusOrderByCreatedAtDesc(status)
                : merchantRepository.findAllByOrderByCreatedAtDesc();

        return list.stream().map(MerchantResponse::fromEntity).collect(Collectors.toList());
    }

    /**
     * SUPER_ADMIN: Approve merchant verification.
     */
    public MerchantResponse approveMerchant(String merchantId, MerchantApprovalRequest req, String superAdminUsername) {
        Merchant merchant = merchantRepository.findById(merchantId)
                .orElseThrow(() -> new ResourceNotFoundException("Merchant not found"));

        merchant.setStatus(MerchantStatus.VERIFIED);
        merchant.setVerifiedBy(superAdminUsername);
        merchant.setVerifiedAt(Instant.now());
        merchant.setRejectionReason(null);
        merchant.setUpdatedAt(Instant.now());
        Merchant saved = merchantRepository.save(merchant);

        VerificationLog logEntry = new VerificationLog();
        logEntry.setMerchantId(saved.getId());
        logEntry.setAction("APPROVED");
        logEntry.setPerformedBy(superAdminUsername);
        logEntry.setReason(req != null && req.getReason() != null ? req.getReason() : "GST Certificate & Business details verified by platform administrator.");
        logEntry.setTimestamp(Instant.now());
        verificationLogRepository.save(logEntry);

        log.info("Merchant {} (ID: {}) APPROVED by {}", saved.getTradeName(), saved.getId(), superAdminUsername);
        return MerchantResponse.fromEntity(saved);
    }

    /**
     * SUPER_ADMIN: Reject merchant verification with a documented reason.
     */
    public MerchantResponse rejectMerchant(String merchantId, MerchantApprovalRequest req, String superAdminUsername) {
        Merchant merchant = merchantRepository.findById(merchantId)
                .orElseThrow(() -> new ResourceNotFoundException("Merchant not found"));

        String reason = (req != null && req.getReason() != null && !req.getReason().isBlank())
                ? req.getReason().trim()
                : "Submitted GST Certificate or business information did not meet verification criteria.";

        merchant.setStatus(MerchantStatus.REJECTED);
        merchant.setRejectionReason(reason);
        merchant.setVerifiedBy(superAdminUsername);
        merchant.setVerifiedAt(Instant.now());
        merchant.setUpdatedAt(Instant.now());
        Merchant saved = merchantRepository.save(merchant);

        VerificationLog logEntry = new VerificationLog();
        logEntry.setMerchantId(saved.getId());
        logEntry.setAction("REJECTED");
        logEntry.setPerformedBy(superAdminUsername);
        logEntry.setReason(reason);
        logEntry.setTimestamp(Instant.now());
        verificationLogRepository.save(logEntry);

        log.warn("Merchant {} (ID: {}) REJECTED by {}: {}", saved.getTradeName(), saved.getId(), superAdminUsername, reason);
        return MerchantResponse.fromEntity(saved);
    }

    /**
     * SUPER_ADMIN: Suspend verified merchant.
     */
    public MerchantResponse suspendMerchant(String merchantId, MerchantApprovalRequest req, String superAdminUsername) {
        Merchant merchant = merchantRepository.findById(merchantId)
                .orElseThrow(() -> new ResourceNotFoundException("Merchant not found"));

        String reason = (req != null && req.getReason() != null && !req.getReason().isBlank())
                ? req.getReason().trim()
                : "Merchant account suspended by administrator.";

        merchant.setStatus(MerchantStatus.SUSPENDED);
        merchant.setRejectionReason(reason);
        merchant.setUpdatedAt(Instant.now());
        Merchant saved = merchantRepository.save(merchant);

        VerificationLog logEntry = new VerificationLog();
        logEntry.setMerchantId(saved.getId());
        logEntry.setAction("SUSPENDED");
        logEntry.setPerformedBy(superAdminUsername);
        logEntry.setReason(reason);
        logEntry.setTimestamp(Instant.now());
        verificationLogRepository.save(logEntry);

        log.warn("Merchant {} (ID: {}) SUSPENDED by {}", saved.getTradeName(), saved.getId(), superAdminUsername);
        return MerchantResponse.fromEntity(saved);
    }

    /**
     * Get verification logs for a merchant.
     */
    public List<VerificationLog> getVerificationLogs(String merchantId) {
        return verificationLogRepository.findByMerchantIdOrderByTimestampDesc(merchantId);
    }

    /**
     * Get logged-in user's merchant details.
     */
    public MerchantResponse getMyBusiness(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BadRequestException("User not found"));

        if (user.getMerchantId() == null) return null;

        return merchantRepository.findById(user.getMerchantId())
                .map(MerchantResponse::fromEntity)
                .orElse(null);
    }

    /**
     * Merchant Admin updates business details (GSTIN & Legal name remain locked).
     */
    public MerchantResponse updateMyBusiness(String username, UpdateBusinessRequest req) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BadRequestException("User not found"));

        if (user.getRole() != Role.ADMIN && user.getRole() != Role.SUPER_ADMIN) {
            throw new BadRequestException("Only an Admin can update business details.");
        }
        if (user.getMerchantId() == null) {
            throw new BadRequestException("No merchant associated with this account.");
        }

        Merchant merchant = merchantRepository.findById(user.getMerchantId())
                .orElseThrow(() -> new ResourceNotFoundException("Merchant not found"));

        if (req.getTradeName() != null && !req.getTradeName().isBlank()) merchant.setTradeName(req.getTradeName().trim());
        if (req.getBusinessType() != null && !req.getBusinessType().isBlank()) merchant.setBusinessType(req.getBusinessType().trim());
        if (req.getRegisteredAddress() != null && !req.getRegisteredAddress().isBlank()) merchant.setRegisteredAddress(req.getRegisteredAddress().trim());
        if (req.getState() != null && !req.getState().isBlank()) merchant.setState(req.getState().trim());
        if (req.getPincode() != null && !req.getPincode().isBlank()) merchant.setPincode(req.getPincode().trim());
        if (req.getContactEmail() != null && !req.getContactEmail().isBlank()) merchant.setContactEmail(req.getContactEmail().trim());
        if (req.getContactPhone() != null && !req.getContactPhone().isBlank()) merchant.setContactPhone(req.getContactPhone().trim());

        merchant.setUpdatedAt(Instant.now());
        Merchant saved = merchantRepository.save(merchant);
        return MerchantResponse.fromEntity(saved);
    }

    /**
     * Get staff users (Accountants & Viewers) belonging to the logged-in admin's merchant.
     */
    public List<StaffUserResponse> getStaff(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BadRequestException("User not found"));

        if (user.getMerchantId() == null) return List.of();

        return userRepository.findByMerchantIdOrderByCreatedAtDesc(user.getMerchantId())
                .stream()
                .filter(u -> !u.getId().equals(user.getId())) // exclude self
                .map(StaffUserResponse::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Merchant Admin adds a new staff member (Accountant or Viewer).
     */
    public StaffUserResponse createStaff(String adminUsername, CreateStaffRequest req) {
        User admin = userRepository.findByUsername(adminUsername)
                .orElseThrow(() -> new BadRequestException("Admin not found"));

        if (admin.getRole() != Role.ADMIN && admin.getRole() != Role.SUPER_ADMIN) {
            throw new BadRequestException("Only an Admin can add staff users.");
        }
        if (admin.getMerchantId() == null) {
            throw new BadRequestException("Admin account is not linked to a merchant.");
        }

        if (userRepository.existsByUsername(req.getUsername())) {
            throw new BadRequestException("Username '" + req.getUsername() + "' is already taken.");
        }
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new BadRequestException("Email '" + req.getEmail() + "' is already in use.");
        }

        Role staffRole = Role.VIEWER;
        if (req.getRole() != null && req.getRole().equalsIgnoreCase("ACCOUNTANT")) {
            staffRole = Role.ACCOUNTANT;
        }

        User staff = new User();
        staff.setUsername(req.getUsername().trim());
        staff.setFullName(req.getFullName().trim());
        staff.setEmail(req.getEmail().trim());
        staff.setPhone(req.getPhone() != null ? req.getPhone().trim() : "");
        staff.setPassword(passwordEncoder.encode(req.getPassword()));
        staff.setRole(staffRole);
        staff.setMerchantId(admin.getMerchantId());
        staff.setEnabled(true);
        staff.setCreatedAt(Instant.now());
        staff.setUpdatedAt(Instant.now());

        User saved = userRepository.save(staff);
        log.info("Created staff user {} with role {} for merchant {}", saved.getUsername(), saved.getRole(), admin.getMerchantId());
        return StaffUserResponse.fromEntity(saved);
    }

    /**
     * Toggle staff member enabled / disabled status.
     */
    public StaffUserResponse toggleStaffStatus(String adminUsername, String staffUserId, boolean enabled) {
        User admin = userRepository.findByUsername(adminUsername)
                .orElseThrow(() -> new BadRequestException("Admin not found"));

        User staff = userRepository.findById(staffUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Staff user not found"));

        if (admin.getRole() != Role.SUPER_ADMIN && !admin.getMerchantId().equals(staff.getMerchantId())) {
            throw new BadRequestException("You do not have permission to manage this staff user.");
        }

        staff.setEnabled(enabled);
        staff.setUpdatedAt(Instant.now());
        User saved = userRepository.save(staff);
        return StaffUserResponse.fromEntity(saved);
    }
}
