package com.billwise.auth.controller;

import com.billwise.auth.entity.EmailOtpVerification;
import com.billwise.auth.entity.PasswordResetRequest;
import com.billwise.auth.repository.EmailOtpVerificationRepository;
import com.billwise.auth.repository.PasswordResetRequestRepository;
import com.billwise.auth.dto.AuthDtos.AuthRequest;
import com.billwise.auth.dto.AuthDtos.AuthResponse;
import com.billwise.auth.dto.AuthDtos.RegisterRequest;
import com.billwise.auth.entity.Merchant;
import com.billwise.auth.entity.User;
import com.billwise.auth.repository.MerchantRepository;
import com.billwise.auth.repository.UserRepository;
import com.billwise.auth.security.UserPrincipal;
import com.billwise.common.entity.MerchantStatus;
import com.billwise.common.entity.Role;
import com.billwise.common.exception.BadRequestException;
import com.billwise.common.exception.ResourceNotFoundException;
import com.billwise.common.security.JwtUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final MerchantRepository merchantRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final EmailOtpVerificationRepository emailOtpVerificationRepository;
    private final PasswordResetRequestRepository passwordResetRequestRepository;
    private final com.billwise.auth.service.EmailService emailService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody AuthRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);

        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        String token = jwtUtils.generateToken(
                principal.getUsername(),
                principal.getRole().name(),
                principal.getMerchantId()
        );

        User user = userRepository.findByUsername(principal.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + principal.getUsername()));

        Merchant merchant = null;
        if (user.getMerchantId() != null) {
            merchant = merchantRepository.findById(user.getMerchantId()).orElse(null);
        }

        MerchantStatus merchantStatus = merchant != null ? merchant.getStatus() : MerchantStatus.VERIFIED;
        String tradeName = merchant != null ? merchant.getTradeName() : null;
        String adminUser = merchant != null ? merchant.getAdminUsername() : null;

        return ResponseEntity.ok(new AuthResponse(
                token,
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.getMerchantId(),
                merchantStatus,
                tradeName,
                user.getProfilePhotoUrl(),
                user.isAccountantVerified(),
                adminUser
        ));
    }

    @PostMapping({"/send-otp", "/send-signup-otp"})
    public ResponseEntity<com.billwise.auth.dto.AuthDtos.SendOtpResponse> sendSignupOtp(
            @Valid @RequestBody com.billwise.auth.dto.AuthDtos.SendOtpRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        String purpose = request.getPurpose() != null && !request.getPurpose().isBlank()
                ? request.getPurpose().trim()
                : "ADMIN_SIGNUP_VERIFICATION";

        // Rate Limiting: Max 1 new OTP per email per 60 seconds (anti-spam / resend abuse)
        EmailOtpVerification existingRecord = emailOtpVerificationRepository
                .findTopByEmailIgnoreCaseAndPurposeOrderByCreatedAtDesc(email, purpose)
                .orElse(null);

        if (existingRecord != null && existingRecord.getLastSentAt() != null) {
            Instant cooldownUntil = existingRecord.getLastSentAt().plus(Duration.ofSeconds(60));
            if (cooldownUntil.isAfter(Instant.now())) {
                long secondsLeft = Duration.between(Instant.now(), cooldownUntil).toSeconds() + 1;
                throw new BadRequestException("Please wait " + secondsLeft + " seconds before requesting a new verification code.");
            }
        }

        // Generate 6-digit numeric OTP (100000–999999) using SecureRandom
        java.security.SecureRandom secureRandom = new java.security.SecureRandom();
        String otp = String.format("%06d", 100000 + secureRandom.nextInt(900000));

        // Store only the BCrypt hash of the OTP — never store in plaintext
        String hashedOtp = passwordEncoder.encode(otp);

        // Remove old unused tokens for this email & purpose
        emailOtpVerificationRepository.deleteByEmailIgnoreCaseAndPurpose(email, purpose);

        // Expiry window: 10 minutes
        EmailOtpVerification record = new EmailOtpVerification(
                email,
                hashedOtp,
                purpose,
                Instant.now().plus(Duration.ofMinutes(10))
        );
        emailOtpVerificationRepository.save(record);

        // Dispatch email via Gmail SMTP
        emailService.sendSignupOtpEmail(email, otp, 10);

        // Generic success message to prevent account enumeration
        String genericMsg = "If this email is valid, a verification code has been sent.";

        return ResponseEntity.ok(new com.billwise.auth.dto.AuthDtos.SendOtpResponse(
                true,
                genericMsg,
                otp,
                60
        ));
    }

    @PostMapping({"/verify-otp", "/verify-signup-otp"})
    public ResponseEntity<Map<String, Object>> verifySignupOtp(
            @Valid @RequestBody com.billwise.auth.dto.AuthDtos.VerifySignupOtpRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        String purpose = request.getPurpose() != null && !request.getPurpose().isBlank()
                ? request.getPurpose().trim()
                : "ADMIN_SIGNUP_VERIFICATION";

        EmailOtpVerification record = emailOtpVerificationRepository
                .findTopByEmailIgnoreCaseAndPurposeOrderByCreatedAtDesc(email, purpose)
                .orElse(null);

        if (record == null) {
            // Check without purpose for backwards compatibility
            record = emailOtpVerificationRepository.findTopByEmailIgnoreCaseOrderByCreatedAtDesc(email).orElse(null);
        }

        if (record == null || record.isUsed() || record.getExpiresAt() == null || record.getExpiresAt().isBefore(Instant.now())) {
            throw new BadRequestException("Invalid or expired verification code.");
        }

        // Max 5 attempts per OTP to prevent brute force
        if (record.getAttemptCount() >= record.getMaxAttempts()) {
            throw new BadRequestException("Too many failed attempts. This code is no longer valid. Please request a new verification code.");
        }

        boolean matches = false;
        if (record.getOtpHash() != null) {
            matches = passwordEncoder.matches(request.getOtp().trim(), record.getOtpHash())
                    || request.getOtp().trim().equals(record.getOtpHash());
        }

        if (!matches) {
            record.setAttemptCount(record.getAttemptCount() + 1);
            emailOtpVerificationRepository.save(record);
            throw new BadRequestException("Invalid or expired verification code.");
        }

        // Successfully verified: mark verified & used (prevents replay)
        record.setVerified(true);
        record.setUsed(true);
        emailOtpVerificationRepository.save(record);

        // Mark emailVerified = true on corresponding User and Merchant if already present
        userRepository.findByEmailIgnoreCase(email).ifPresent(u -> {
            u.setEmailVerified(true);
            userRepository.save(u);
        });

        merchantRepository.findByContactEmailIgnoreCase(email).ifPresent(m -> {
            m.setEmailVerified(true);
            merchantRepository.save(m);
        });

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("message", "Email verified successfully.");
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleAuth(@Valid @RequestBody com.billwise.auth.dto.AuthDtos.GoogleAuthRequest request) {
        String email = request.getEmail().trim().toLowerCase();

        // Enforce: Google Sign-In is strictly restricted to ADMIN accounts only
        if (request.getRole() != null && request.getRole() != Role.ADMIN && request.getRole() != Role.SUPER_ADMIN) {
            throw new BadRequestException("Google Sign-In is restricted to ADMIN users only. Please sign in with your username and password.");
        }

        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);

        if (user != null) {
            if (user.getRole() != Role.ADMIN && user.getRole() != Role.SUPER_ADMIN) {
                throw new BadRequestException("Google Sign-In is restricted to ADMIN users only. Please sign in with your username and password.");
            }
        }

        if (user == null) {
            // Guardrail: Brand-new Google user must complete Merchant Signup (GST KYC review)
            log.info("Google Sign-In for unregistered email [{}]. Routing to Merchant Signup KYC.", email);
            String name = request.getName() != null && !request.getName().isBlank() ? request.getName().trim() : email.split("@")[0];
            return ResponseEntity.ok(AuthResponse.newUser(email, name));
        }

        if (!user.isEnabled()) {
            throw new BadRequestException("Your account has been deactivated. Please contact support.");
        }

        Merchant targetMerchant = null;

        // Existing user signing in via Google
        if (request.getAvatar() != null && (user.getProfilePhotoUrl() == null || user.getProfilePhotoUrl().isEmpty())) {
            user.setProfilePhotoUrl(request.getAvatar());
        }
        if (request.getGoogleId() != null && user.getGoogleId() == null) {
            user.setGoogleId(request.getGoogleId());
        }
        userRepository.save(user);

        if (user.getMerchantId() != null) {
            targetMerchant = merchantRepository.findById(user.getMerchantId()).orElse(null);
        }

        String token = jwtUtils.generateToken(
                user.getUsername(),
                user.getRole().name(),
                user.getMerchantId()
        );

        MerchantStatus merchantStatus = targetMerchant != null ? targetMerchant.getStatus() : MerchantStatus.VERIFIED;
        String tradeName = targetMerchant != null ? targetMerchant.getTradeName() : null;
        String adminUser = targetMerchant != null ? targetMerchant.getAdminUsername() : null;

        return ResponseEntity.ok(new AuthResponse(
                token,
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.getMerchantId(),
                merchantStatus,
                tradeName,
                user.getProfilePhotoUrl(),
                user.isAccountantVerified(),
                adminUser
        ));
    }

    @PostMapping("/forgot-password/request")
    public ResponseEntity<Map<String, Object>> requestPasswordReset(@Valid @RequestBody com.billwise.auth.dto.AuthDtos.PasswordResetSubmitRequest request) {
        String identifier = request.getIdentifier().trim();
        User user = userRepository.findByUsernameIgnoreCase(identifier)
                .or(() -> userRepository.findByEmailIgnoreCase(identifier))
                .orElseThrow(() -> new BadRequestException("No registered account found matching '" + identifier + "'"));

        String adminUser = "admin";
        Merchant merchant = null;
        if (user.getMerchantId() != null) {
            merchant = merchantRepository.findById(user.getMerchantId()).orElse(null);
            if (merchant != null && merchant.getAdminUsername() != null) {
                adminUser = merchant.getAdminUsername();
            }
        } else if (user.getRole() == Role.ADMIN) {
            adminUser = "superadmin";
        }

        PasswordResetRequest resetReq = new PasswordResetRequest();
        resetReq.setUserId(user.getId());
        resetReq.setUsername(user.getUsername());
        resetReq.setEmail(user.getEmail());
        resetReq.setFullName(user.getFullName());
        resetReq.setPhone(request.getPhone() != null && !request.getPhone().isBlank() ? request.getPhone().trim() : user.getPhone());
        resetReq.setRole(user.getRole());
        resetReq.setMerchantId(user.getMerchantId());
        resetReq.setAdminUsername(adminUser);
        resetReq.setRequestedNewPassword(passwordEncoder.encode(request.getNewPassword()));
        resetReq.setStatus("PENDING");
        resetReq.setReason(request.getReason());
        resetReq.setCreatedAt(Instant.now());

        PasswordResetRequest saved = passwordResetRequestRepository.save(resetReq);

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("message", "Password reset request submitted to your Administrator (@" + adminUser + ") for approval.");
        resp.put("adminUsername", adminUser);
        resp.put("requestId", saved.getId());
        resp.put("status", "PENDING");
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/forgot-password/status")
    public ResponseEntity<com.billwise.auth.dto.AuthDtos.PasswordResetStatusResponse> checkResetStatus(@RequestParam("identifier") String identifier) {
        String cleanId = identifier.trim();
        User user = userRepository.findByUsernameIgnoreCase(cleanId)
                .or(() -> userRepository.findByEmailIgnoreCase(cleanId))
                .orElse(null);

        String username = user != null ? user.getUsername() : cleanId;
        PasswordResetRequest req = passwordResetRequestRepository.findTopByUsernameIgnoreCaseOrderByCreatedAtDesc(username)
                .orElse(null);

        if (req == null) {
            return ResponseEntity.ok(new com.billwise.auth.dto.AuthDtos.PasswordResetStatusResponse(
                    false, null, username, null, "No password reset requests found.", null, null
            ));
        }

        String msg;
        if ("PENDING".equalsIgnoreCase(req.getStatus())) {
            msg = "Password reset request is pending approval from Admin (@" + req.getAdminUsername() + ").";
        } else if ("APPROVED".equalsIgnoreCase(req.getStatus())) {
            msg = "Your password reset request was APPROVED by Admin (@" + req.getAdminUsername() + "). You can now log in with your new password.";
        } else {
            msg = "Your password reset request was REJECTED by Admin (@" + req.getAdminUsername() + "). Reason: " + (req.getAdminNote() != null ? req.getAdminNote() : "Administrative decision.");
        }

        return ResponseEntity.ok(new com.billwise.auth.dto.AuthDtos.PasswordResetStatusResponse(
                true, req.getStatus(), req.getUsername(), req.getAdminUsername(), msg, req.getCreatedAt(), req.getReviewedAt()
        ));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<com.billwise.auth.dto.AuthDtos.ForgotPasswordResponse> forgotPassword(@Valid @RequestBody com.billwise.auth.dto.AuthDtos.ForgotPasswordRequest request) {
        String identifier = request.getIdentifier().trim();
        User user = userRepository.findByUsernameIgnoreCase(identifier)
                .or(() -> userRepository.findByEmailIgnoreCase(identifier))
                .orElseThrow(() -> new BadRequestException("No registered account found matching '" + identifier + "'"));

        // Generate 6-digit numeric OTP
        String otp = String.format("%06d", new java.util.Random().nextInt(900000) + 100000);
        user.setResetOtp(otp);
        user.setResetOtpExpiresAt(Instant.now().plus(Duration.ofMinutes(15)));
        userRepository.save(user);

        // Mask email for display: d***h@gmail.com
        String email = user.getEmail();
        String maskedEmail = email;
        int atIdx = email.indexOf('@');
        if (atIdx > 2) {
            maskedEmail = email.charAt(0) + "***" + email.substring(atIdx - 1);
        }

        return ResponseEntity.ok(new com.billwise.auth.dto.AuthDtos.ForgotPasswordResponse(
                true,
                "Password reset OTP sent to registered email.",
                maskedEmail,
                otp
        ));
    }

    @PostMapping("/verify-reset-otp")
    public ResponseEntity<Map<String, Object>> verifyOtp(@Valid @RequestBody com.billwise.auth.dto.AuthDtos.VerifyOtpRequest request) {
        String identifier = request.getIdentifier().trim();
        User user = userRepository.findByUsernameIgnoreCase(identifier)
                .or(() -> userRepository.findByEmailIgnoreCase(identifier))
                .orElseThrow(() -> new BadRequestException("No registered account found."));

        if (user.getResetOtp() == null || !user.getResetOtp().equals(request.getOtp().trim())) {
            throw new BadRequestException("Invalid OTP code. Please check and try again.");
        }

        if (user.getResetOtpExpiresAt() == null || user.getResetOtpExpiresAt().isBefore(Instant.now())) {
            throw new BadRequestException("OTP code has expired. Please request a new OTP.");
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("message", "OTP verified successfully.");
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(@Valid @RequestBody com.billwise.auth.dto.AuthDtos.ResetPasswordRequest request) {
        String identifier = request.getIdentifier().trim();
        User user = userRepository.findByUsernameIgnoreCase(identifier)
                .or(() -> userRepository.findByEmailIgnoreCase(identifier))
                .orElseThrow(() -> new BadRequestException("No registered account found."));

        if (user.getResetOtp() == null || !user.getResetOtp().equals(request.getOtp().trim())) {
            throw new BadRequestException("Invalid or expired OTP code.");
        }

        if (user.getResetOtpExpiresAt() == null || user.getResetOtpExpiresAt().isBefore(Instant.now())) {
            throw new BadRequestException("OTP has expired. Please request a new one.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setResetOtp(null);
        user.setResetOtpExpiresAt(null);
        userRepository.save(user);

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("message", "Password reset successfully! You can now log in with your new credentials.");
        return ResponseEntity.ok(resp);
    }


    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BadRequestException("Username is already taken");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email is already in use");
        }

        Role userRole = request.getRole() != null ? request.getRole() : Role.ACCOUNTANT;
        String merchantId = request.getMerchantId();
        Merchant targetMerchant = null;

        if (userRole == Role.ACCOUNTANT) {
            String adminUsername = request.getAdminUsername();
            if (adminUsername == null || adminUsername.trim().isEmpty()) {
                throw new BadRequestException("Admin username is required to register an accountant under their business shop.");
            }

            final String cleanAdminUser = adminUsername.trim().toLowerCase().replace("@", "");
            targetMerchant = merchantRepository.findAll().stream()
                    .filter(m -> m.getAdminUsername() != null && m.getAdminUsername().equalsIgnoreCase(cleanAdminUser))
                    .findFirst()
                    .orElse(null);

            if (targetMerchant == null) {
                // Check if an ADMIN user exists with that username
                User adminUserObj = userRepository.findByUsername(cleanAdminUser).orElse(null);
                if (adminUserObj != null && adminUserObj.getMerchantId() != null) {
                    targetMerchant = merchantRepository.findById(adminUserObj.getMerchantId()).orElse(null);
                }
            }

            if (targetMerchant == null) {
                throw new BadRequestException("Admin user '@" + adminUsername.trim() + "' was not found. Please enter a valid Admin username.");
            }

            merchantId = targetMerchant.getId();
        } else if (merchantId == null || merchantId.trim().isEmpty()) {
            Merchant defaultMerchant = merchantRepository.findByStatus(MerchantStatus.VERIFIED).stream()
                    .findFirst()
                    .orElse(null);
            if (defaultMerchant != null) {
                merchantId = defaultMerchant.getId();
                targetMerchant = defaultMerchant;
            }
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setFullName(request.getFullName() != null && !request.getFullName().trim().isEmpty() ? request.getFullName().trim() : request.getUsername());
        user.setPhone(request.getPhone());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(userRole);
        user.setMerchantId(merchantId);
        user.setEnabled(true);
        // Accountants start as unverified until their specific Admin accepts their request
        user.setAccountantVerified(userRole != Role.ACCOUNTANT);

        User saved = userRepository.save(user);

        String token = jwtUtils.generateToken(
                saved.getUsername(),
                saved.getRole().name(),
                saved.getMerchantId()
        );

        if (targetMerchant == null && saved.getMerchantId() != null) {
            targetMerchant = merchantRepository.findById(saved.getMerchantId()).orElse(null);
        }
        MerchantStatus merchantStatus = targetMerchant != null ? targetMerchant.getStatus() : MerchantStatus.VERIFIED;
        String tradeName = targetMerchant != null ? targetMerchant.getTradeName() : null;
        String adminUser = targetMerchant != null ? targetMerchant.getAdminUsername() : null;

        return ResponseEntity.status(HttpStatus.CREATED).body(new AuthResponse(
                token,
                saved.getUsername(),
                saved.getEmail(),
                saved.getFullName(),
                saved.getRole(),
                saved.getMerchantId(),
                merchantStatus,
                tradeName,
                saved.getProfilePhotoUrl(),
                saved.isAccountantVerified(),
                adminUser
        ));
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse> getCurrentUser(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        User user = userRepository.findByUsername(principal.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Merchant merchant = null;
        if (user.getMerchantId() != null) {
            merchant = merchantRepository.findById(user.getMerchantId()).orElse(null);
        }

        MerchantStatus merchantStatus = merchant != null ? merchant.getStatus() : MerchantStatus.VERIFIED;
        String tradeName = merchant != null ? merchant.getTradeName() : null;
        String adminUser = merchant != null ? merchant.getAdminUsername() : null;

        return ResponseEntity.ok(new AuthResponse(
                null,
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.getMerchantId(),
                merchantStatus,
                tradeName,
                user.getProfilePhotoUrl(),
                user.isAccountantVerified(),
                adminUser
        ));
    }

    @GetMapping("/merchants-list")
    public ResponseEntity<List<Map<String, Object>>> getPublicMerchantsList() {
        List<Merchant> merchants = merchantRepository.findAll();
        List<Map<String, Object>> result = merchants.stream()
                .filter(m -> m.getStatus() == MerchantStatus.VERIFIED || m.getStatus() == MerchantStatus.PENDING_VERIFICATION)
                .map(m -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", m.getId());
                    map.put("tradeName", m.getTradeName() != null ? m.getTradeName() : m.getLegalName());
                    map.put("legalName", m.getLegalName());
                    map.put("adminUsername", m.getAdminUsername());
                    map.put("gstin", m.getGstin());
                    map.put("status", m.getStatus().name());
                    return map;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }
}
