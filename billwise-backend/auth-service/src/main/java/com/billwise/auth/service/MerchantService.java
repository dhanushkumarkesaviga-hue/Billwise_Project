package com.billwise.auth.service;

import com.billwise.auth.dto.AuthDtos.AuthResponse;
import com.billwise.auth.dto.AuthDtos.PasswordResetDto;
import com.billwise.auth.dto.MerchantDtos.MerchantSignupRequest;
import com.billwise.auth.dto.MerchantDtos.StaffCreateRequest;
import com.billwise.auth.dto.UserDtos.StaffUserDto;
import com.billwise.auth.entity.EmailOtpVerification;
import com.billwise.auth.entity.Merchant;
import com.billwise.auth.entity.PasswordResetRequest;
import com.billwise.auth.entity.User;
import com.billwise.auth.entity.VerificationLog;
import com.billwise.auth.repository.EmailOtpVerificationRepository;
import com.billwise.auth.repository.MerchantRepository;
import com.billwise.auth.repository.PasswordResetRequestRepository;
import com.billwise.auth.repository.UserRepository;
import com.billwise.auth.repository.VerificationLogRepository;
import com.billwise.common.entity.MerchantStatus;
import com.billwise.common.entity.Role;
import com.billwise.common.exception.BadRequestException;
import com.billwise.common.exception.ResourceNotFoundException;
import com.billwise.common.security.JwtUtils;
import com.billwise.common.util.GstValidationUtil;
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
    private final JwtUtils jwtUtils;
    private final EmailOtpVerificationRepository emailOtpVerificationRepository;
    private final PasswordResetRequestRepository passwordResetRequestRepository;
    private final GoogleTokenVerifierService googleTokenVerifierService;

    public AuthResponse signupMerchant(MerchantSignupRequest req) {
        String cleanGstin = req.getGstin().trim().toUpperCase();
        String cleanPan = req.getResolvedPan();
        String stateCode = req.getResolvedStateCode();
        String adminEmail = req.getResolvedAdminEmail();

        if (!GstValidationUtil.isValidGstinFormat(cleanGstin)) {
            throw new BadRequestException("Invalid GSTIN format. Expected 15-character statutory GSTIN.");
        }

        if (!cleanPan.isBlank() && !GstValidationUtil.matchesPan(cleanGstin, cleanPan)) {
            throw new BadRequestException("PAN does not match characters 3-12 of the provided GSTIN (" + cleanGstin + ").");
        }

        if (merchantRepository.existsByGstin(cleanGstin)) {
            throw new BadRequestException("A merchant with GSTIN " + cleanGstin + " is already registered.");
        }

        if (userRepository.existsByUsername(req.getAdminUsername())) {
            throw new BadRequestException("Username " + req.getAdminUsername() + " is already taken.");
        }

        if (req.getContactPhone() == null || req.getContactPhone().trim().isBlank()) {
            throw new BadRequestException("Contact phone number is mandatory for merchant registration.");
        }

        // Email verification check: Either cryptographically verified Google ID token or valid Email OTP
        String contactEmail = req.getContactEmail() != null ? req.getContactEmail().trim().toLowerCase() : "";
        boolean isGooglePreVerified = false;

        if (req.getGoogleIdToken() != null && !req.getGoogleIdToken().trim().isBlank()) {
            try {
                com.google.api.client.googleapis.auth.oauth2.GoogleIdToken.Payload tokenPayload =
                        googleTokenVerifierService.verifyToken(req.getGoogleIdToken());
                if (tokenPayload.getEmail() != null && tokenPayload.getEmail().trim().equalsIgnoreCase(contactEmail)) {
                    isGooglePreVerified = true;
                    log.info("Merchant signup for [{}] authenticated via verified Google ID token.", contactEmail);
                } else {
                    throw new BadRequestException("Google ID token email does not match the contact email provided.");
                }
            } catch (BadRequestException bre) {
                throw bre;
            } catch (Exception e) {
                log.warn("Invalid Google ID token supplied during merchant registration: {}", e.getMessage());
                throw new BadRequestException("Invalid or forged Google ID token provided for signup email verification: " + e.getMessage());
            }
        }

        if (!contactEmail.isBlank() && !isGooglePreVerified) {
            EmailOtpVerification otpRecord = emailOtpVerificationRepository
                    .findTopByEmailIgnoreCaseAndPurposeOrderByCreatedAtDesc(contactEmail, "ADMIN_SIGNUP_VERIFICATION")
                    .orElse(null);

            if (otpRecord == null) {
                otpRecord = emailOtpVerificationRepository.findTopByEmailIgnoreCaseOrderByCreatedAtDesc(contactEmail).orElse(null);
            }

            if (otpRecord != null && !otpRecord.isVerified()) {
                if (req.getEmailOtp() != null && (passwordEncoder.matches(req.getEmailOtp().trim(), otpRecord.getOtpHash()) || req.getEmailOtp().trim().equals(otpRecord.getOtpHash()))) {
                    otpRecord.setVerified(true);
                    otpRecord.setUsed(true);
                    emailOtpVerificationRepository.save(otpRecord);
                } else {
                    throw new BadRequestException("Email (" + contactEmail + ") has not been verified via OTP. Please complete email OTP verification before submitting.");
                }
            } else if (otpRecord == null || !otpRecord.isVerified()) {
                throw new BadRequestException("Email OTP verification is required for " + contactEmail + ". Please click 'Send OTP' and verify.");
            }
        }

        List<String> duplicateWarnings = new ArrayList<>();
        if (!GstValidationUtil.verifyChecksum(cleanGstin)) {
            duplicateWarnings.add("Notice: GSTIN checksum could not be verified automatically against statutory registry.");
        }
        List<Merchant> similarTradeNames = merchantRepository.findByTradeNameContainingIgnoreCase(req.getTradeName().trim());
        if (!similarTradeNames.isEmpty()) {
            duplicateWarnings.add("Warning: " + similarTradeNames.size() + " other merchant(s) share a similar trade name.");
        }

        String stateName = req.getState() != null && !req.getState().isBlank()
                ? req.getState()
                : GstValidationUtil.getStateFromStateCode(stateCode);

        Merchant merchant = new Merchant();
        merchant.setLegalName(req.getLegalName());
        merchant.setTradeName(req.getTradeName());
        merchant.setGstin(cleanGstin);
        merchant.setPan(cleanPan);
        merchant.setBusinessType(req.getBusinessType() != null ? req.getBusinessType() : "Proprietorship");
        merchant.setRegisteredAddress(req.getRegisteredAddress());
        merchant.setState(stateName);
        merchant.setStateCode(stateCode);
        merchant.setPincode(req.getPincode() != null ? req.getPincode() : "400001");
        merchant.setContactEmail(req.getContactEmail());
        merchant.setContactPhone(req.getContactPhone());
        merchant.setGstCertificateUrl(req.getGstCertificateUrl());
        merchant.setShopLicenseUrl(req.getShopLicenseUrl());
        merchant.setStorefrontPhotoUrl(req.getStorefrontPhotoUrl());
        merchant.setEmailVerified(true);
        merchant.setStatus(MerchantStatus.PENDING_VERIFICATION);
        merchant.setAdminUsername(req.getAdminUsername());
        merchant.setDuplicateWarningFlags(duplicateWarnings);
        merchant.setCreatedAt(Instant.now());
        merchant.setUpdatedAt(Instant.now());

        Merchant savedMerchant = merchantRepository.save(merchant);

        User adminUser = new User();
        adminUser.setUsername(req.getAdminUsername());
        adminUser.setEmail(adminEmail);
        adminUser.setPassword(passwordEncoder.encode(req.getAdminPassword()));
        adminUser.setFullName(req.getAdminFullName() != null ? req.getAdminFullName() : req.getTradeName() + " Admin");
        adminUser.setPhone(req.getAdminPhone() != null ? req.getAdminPhone() : req.getContactPhone());
        adminUser.setRole(Role.ADMIN);
        adminUser.setMerchantId(savedMerchant.getId());
        adminUser.setEmailVerified(true);
        adminUser.setEnabled(true);
        adminUser.setCreatedAt(Instant.now());
        adminUser.setUpdatedAt(Instant.now());

        userRepository.save(adminUser);

        VerificationLog logEntry = new VerificationLog();
        logEntry.setMerchantId(savedMerchant.getId());
        logEntry.setAction("SUBMITTED");
        logEntry.setPerformedBy(req.getAdminUsername());
        logEntry.setReason("Merchant initial registration submitted.");
        logEntry.setTimestamp(Instant.now());
        verificationLogRepository.save(logEntry);

        log.info("Merchant signup successful: {} (GSTIN: {}) - Status: PENDING_VERIFICATION",
                savedMerchant.getTradeName(), savedMerchant.getGstin());

        String token = jwtUtils.generateToken(adminUser.getUsername(), adminUser.getRole().name(), savedMerchant.getId());

        return new AuthResponse(
                token,
                adminUser.getUsername(),
                adminUser.getEmail(),
                adminUser.getFullName(),
                adminUser.getRole(),
                savedMerchant.getId(),
                savedMerchant.getStatus(),
                savedMerchant.getTradeName(),
                adminUser.getProfilePhotoUrl()
        );
    }

    public Merchant resubmitVerification(String merchantId, MerchantSignupRequest req, String callerUsername) {
        Merchant merchant = getMerchantById(merchantId);

        if (merchant.getStatus() != MerchantStatus.REJECTED && merchant.getStatus() != MerchantStatus.PENDING_VERIFICATION) {
            throw new BadRequestException("Only REJECTED or PENDING merchants can resubmit verification documents.");
        }

        merchant.setLegalName(req.getLegalName());
        merchant.setTradeName(req.getTradeName());
        merchant.setRegisteredAddress(req.getRegisteredAddress());
        merchant.setState(req.getState());
        merchant.setStateCode(req.getResolvedStateCode());
        merchant.setPincode(req.getPincode());
        merchant.setContactEmail(req.getContactEmail());
        merchant.setContactPhone(req.getContactPhone());
        merchant.setGstCertificateUrl(req.getGstCertificateUrl());
        merchant.setShopLicenseUrl(req.getShopLicenseUrl());
        merchant.setStorefrontPhotoUrl(req.getStorefrontPhotoUrl());
        merchant.setStatus(MerchantStatus.PENDING_VERIFICATION);
        merchant.setRejectionReason(null);
        merchant.setUpdatedAt(Instant.now());

        Merchant saved = merchantRepository.save(merchant);

        VerificationLog logEntry = new VerificationLog();
        logEntry.setMerchantId(merchant.getId());
        logEntry.setAction("RESUBMITTED");
        logEntry.setPerformedBy(callerUsername);
        logEntry.setReason("Merchant updated documents and resubmitted for verification.");
        logEntry.setTimestamp(Instant.now());
        verificationLogRepository.save(logEntry);

        return saved;
    }

    public List<Merchant> getPendingMerchants() {
        return merchantRepository.findByStatus(MerchantStatus.PENDING_VERIFICATION);
    }

    public List<Merchant> getAllMerchants(MerchantStatus status) {
        if (status != null) {
            return merchantRepository.findByStatus(status);
        }
        return merchantRepository.findAll();
    }

    public Merchant getMerchantById(String id) {
        return merchantRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Merchant not found with id: " + id));
    }

    public Merchant approveMerchant(String merchantId, String superadminUsername, String reason) {
        Merchant merchant = getMerchantById(merchantId);
        merchant.setStatus(MerchantStatus.VERIFIED);
        merchant.setVerifiedBy(superadminUsername);
        merchant.setVerifiedAt(Instant.now());
        merchant.setRejectionReason(null);
        merchant.setUpdatedAt(Instant.now());

        Merchant saved = merchantRepository.save(merchant);

        VerificationLog logEntry = new VerificationLog();
        logEntry.setMerchantId(merchant.getId());
        logEntry.setAction("APPROVED");
        logEntry.setPerformedBy(superadminUsername);
        logEntry.setReason(reason != null && !reason.isBlank() ? reason : "Merchant business verification approved.");
        logEntry.setTimestamp(Instant.now());
        verificationLogRepository.save(logEntry);

        log.info("Merchant {} (ID: {}) APPROVED by {}", merchant.getTradeName(), merchant.getId(), superadminUsername);
        return saved;
    }

    public Merchant rejectMerchant(String merchantId, String superadminUsername, String reason) {
        if (reason == null || reason.isBlank()) {
            throw new BadRequestException("Rejection reason is required when rejecting a merchant.");
        }

        Merchant merchant = getMerchantById(merchantId);
        merchant.setStatus(MerchantStatus.REJECTED);
        merchant.setRejectionReason(reason);
        merchant.setVerifiedBy(superadminUsername);
        merchant.setVerifiedAt(Instant.now());
        merchant.setUpdatedAt(Instant.now());

        Merchant saved = merchantRepository.save(merchant);

        VerificationLog logEntry = new VerificationLog();
        logEntry.setMerchantId(merchant.getId());
        logEntry.setAction("REJECTED");
        logEntry.setPerformedBy(superadminUsername);
        logEntry.setReason(reason);
        logEntry.setTimestamp(Instant.now());
        verificationLogRepository.save(logEntry);

        log.info("Merchant {} (ID: {}) REJECTED by {}: {}", merchant.getTradeName(), merchant.getId(), superadminUsername, reason);
        return saved;
    }

    public Merchant suspendMerchant(String merchantId, String superadminUsername, String reason) {
        Merchant merchant = getMerchantById(merchantId);
        merchant.setStatus(MerchantStatus.SUSPENDED);
        merchant.setRejectionReason(reason);
        merchant.setUpdatedAt(Instant.now());

        Merchant saved = merchantRepository.save(merchant);

        VerificationLog logEntry = new VerificationLog();
        logEntry.setMerchantId(merchant.getId());
        logEntry.setAction("SUSPENDED");
        logEntry.setPerformedBy(superadminUsername);
        logEntry.setReason(reason != null ? reason : "Account suspended by Super Administrator.");
        logEntry.setTimestamp(Instant.now());
        verificationLogRepository.save(logEntry);

        return saved;
    }

    public List<VerificationLog> getVerificationLogs(String merchantId) {
        return verificationLogRepository.findByMerchantIdOrderByTimestampDesc(merchantId);
    }

    public StaffUserDto createStaffUser(String merchantId, StaffCreateRequest req) {
        if (req.getRole() != null && req.getRole() != Role.ACCOUNTANT) {
            throw new BadRequestException("Staff role must be ACCOUNTANT.");
        }

        if (userRepository.existsByUsername(req.getUsername())) {
            throw new BadRequestException("Username " + req.getUsername() + " is already taken.");
        }

        if (userRepository.existsByEmail(req.getEmail())) {
            throw new BadRequestException("Email " + req.getEmail() + " is already registered.");
        }

        User staff = new User();
        staff.setUsername(req.getUsername());
        staff.setEmail(req.getEmail());
        staff.setPassword(passwordEncoder.encode(req.getPassword()));
        staff.setFullName(req.getFullName());
        staff.setPhone(req.getPhone());
        staff.setRole(req.getRole());
        staff.setMerchantId(merchantId);
        staff.setEnabled(true);
        // Accountants start as unverified until the Admin verifies them
        staff.setAccountantVerified(req.getRole() != Role.ACCOUNTANT);
        staff.setCreatedAt(Instant.now());
        staff.setUpdatedAt(Instant.now());

        User saved = userRepository.save(staff);
        return toStaffDto(saved);
    }

    public List<StaffUserDto> getStaffUsers(String merchantId) {
        return userRepository.findByMerchantId(merchantId).stream()
                .filter(u -> u.getRole() != Role.ADMIN)
                .map(this::toStaffDto)
                .collect(Collectors.toList());
    }

    public StaffUserDto toggleStaffStatus(String merchantId, String staffUserId, boolean enabled) {
        User staff = userRepository.findById(staffUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Staff user not found: " + staffUserId));

        if (!merchantId.equals(staff.getMerchantId())) {
            throw new BadRequestException("User does not belong to this merchant organization.");
        }

        staff.setEnabled(enabled);
        staff.setUpdatedAt(Instant.now());
        User saved = userRepository.save(staff);
        return toStaffDto(saved);
    }

    public StaffUserDto verifyStaffUser(String merchantId, String staffUserId, boolean verified, String adminUsername) {
        User staff = userRepository.findById(staffUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Staff user not found: " + staffUserId));

        if (!merchantId.equals(staff.getMerchantId())) {
            throw new BadRequestException("User does not belong to this merchant organization.");
        }

        staff.setAccountantVerified(verified);
        staff.setVerifiedByAdmin(verified ? adminUsername : null);
        staff.setAccountantVerifiedAt(verified ? Instant.now() : null);
        staff.setUpdatedAt(Instant.now());
        User saved = userRepository.save(staff);
        return toStaffDto(saved);
    }

    public void deleteStaffUser(String merchantId, String staffUserId) {
        User staff = userRepository.findById(staffUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Staff user not found: " + staffUserId));

        if (merchantId == null || !merchantId.equals(staff.getMerchantId())) {
            throw new BadRequestException("You do not have permission to delete this user.");
        }

        if (staff.getRole() == Role.ADMIN || staff.getRole() == Role.SUPER_ADMIN) {
            throw new BadRequestException("Cannot delete an Administrator account.");
        }

        userRepository.delete(staff);
        log.info("Staff accountant [{}] (ID: {}) permanently deleted from merchant [{}]", staff.getUsername(), staffUserId, merchantId);
    }

    private StaffUserDto toStaffDto(User u) {
        return new StaffUserDto(
                u.getId(),
                u.getUsername(),
                u.getEmail(),
                u.getFullName(),
                u.getPhone(),
                u.getProfilePhotoUrl(),
                u.getRole(),
                u.isEnabled(),
                u.isAccountantVerified(),
                u.getVerifiedByAdmin(),
                u.getAccountantVerifiedAt()
        );
    }

    public List<PasswordResetDto> getPendingPasswordResets(String merchantId, String adminUsername) {
        List<PasswordResetRequest> list;
        if (merchantId != null && !merchantId.isBlank()) {
            list = passwordResetRequestRepository.findByMerchantIdAndStatusOrderByCreatedAtDesc(merchantId, "PENDING");
        } else if (adminUsername != null && !adminUsername.isBlank()) {
            list = passwordResetRequestRepository.findByAdminUsernameIgnoreCaseAndStatusOrderByCreatedAtDesc(adminUsername, "PENDING");
        } else {
            list = passwordResetRequestRepository.findByStatusOrderByCreatedAtDesc("PENDING");
        }
        return list.stream().map(this::toPasswordResetDto).collect(Collectors.toList());
    }

    public List<PasswordResetDto> getAllPasswordResets(String merchantId, String adminUsername) {
        List<PasswordResetRequest> list;
        if (merchantId != null && !merchantId.isBlank()) {
            list = passwordResetRequestRepository.findByMerchantIdOrderByCreatedAtDesc(merchantId);
        } else if (adminUsername != null && !adminUsername.isBlank()) {
            list = passwordResetRequestRepository.findByAdminUsernameIgnoreCaseOrderByCreatedAtDesc(adminUsername);
        } else {
            list = passwordResetRequestRepository.findAll();
        }
        return list.stream().map(this::toPasswordResetDto).collect(Collectors.toList());
    }

    public PasswordResetDto approvePasswordReset(String merchantId, String requestId, String adminUsername, String note) {
        PasswordResetRequest req = passwordResetRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Password reset request not found: " + requestId));

        if (merchantId != null && !merchantId.equals(req.getMerchantId()) && !"superadmin".equalsIgnoreCase(adminUsername)) {
            throw new BadRequestException("Request does not belong to your merchant shop.");
        }

        if (!"PENDING".equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Password reset request is already " + req.getStatus());
        }

        User user = userRepository.findById(req.getUserId())
                .or(() -> userRepository.findByUsername(req.getUsername()))
                .orElseThrow(() -> new ResourceNotFoundException("User " + req.getUsername() + " not found."));

        // Apply requested new password to user account
        user.setPassword(req.getRequestedNewPassword());
        user.setResetOtp(null);
        user.setResetOtpExpiresAt(null);
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);

        req.setStatus("APPROVED");
        req.setAdminNote(note != null && !note.isBlank() ? note.trim() : "Approved by Admin @" + adminUsername);
        req.setReviewedByAdmin(adminUsername);
        req.setReviewedAt(Instant.now());
        PasswordResetRequest saved = passwordResetRequestRepository.save(req);

        log.info("Password reset request [{}] for user [{}] APPROVED by admin [{}]", requestId, req.getUsername(), adminUsername);
        return toPasswordResetDto(saved);
    }

    public PasswordResetDto rejectPasswordReset(String merchantId, String requestId, String adminUsername, String reason) {
        PasswordResetRequest req = passwordResetRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Password reset request not found: " + requestId));

        if (merchantId != null && !merchantId.equals(req.getMerchantId()) && !"superadmin".equalsIgnoreCase(adminUsername)) {
            throw new BadRequestException("Request does not belong to your merchant shop.");
        }

        if (!"PENDING".equalsIgnoreCase(req.getStatus())) {
            throw new BadRequestException("Password reset request is already " + req.getStatus());
        }

        req.setStatus("REJECTED");
        req.setAdminNote(reason != null && !reason.isBlank() ? reason.trim() : "Rejected by Admin @" + adminUsername);
        req.setReviewedByAdmin(adminUsername);
        req.setReviewedAt(Instant.now());
        PasswordResetRequest saved = passwordResetRequestRepository.save(req);

        log.info("Password reset request [{}] for user [{}] REJECTED by admin [{}]", requestId, req.getUsername(), adminUsername);
        return toPasswordResetDto(saved);
    }

    private PasswordResetDto toPasswordResetDto(PasswordResetRequest r) {
        return new PasswordResetDto(
                r.getId(),
                r.getUserId(),
                r.getUsername(),
                r.getEmail(),
                r.getFullName(),
                r.getPhone(),
                r.getRole(),
                r.getMerchantId(),
                r.getAdminUsername(),
                r.getStatus(),
                r.getReason(),
                r.getAdminNote(),
                r.getReviewedByAdmin(),
                r.getCreatedAt(),
                r.getReviewedAt()
        );
    }
}

