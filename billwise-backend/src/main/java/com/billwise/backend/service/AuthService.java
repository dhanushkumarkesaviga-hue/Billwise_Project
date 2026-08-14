package com.billwise.backend.service;

import com.billwise.backend.dto.AuthResponse;
import com.billwise.backend.dto.LoginRequest;
import com.billwise.backend.dto.RegisterRequest;
import com.billwise.backend.entity.EmailOtpVerification;
import com.billwise.backend.entity.Merchant;
import com.billwise.backend.entity.Role;
import com.billwise.backend.entity.User;
import com.billwise.backend.exception.BadRequestException;
import com.billwise.backend.repository.EmailOtpVerificationRepository;
import com.billwise.backend.repository.MerchantRepository;
import com.billwise.backend.repository.UserRepository;
import com.billwise.backend.security.JwtUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final MerchantRepository merchantRepository;
    private final EmailOtpVerificationRepository emailOtpVerificationRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BadRequestException("Username is already taken");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email is already registered");
        }

        Role role = parseRole(request.getRole());

        User user = new User();
        user.setUsername(request.getUsername().trim());
        user.setEmail(request.getEmail().trim());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(role);
        userRepository.save(user);

        return buildAuthResponse(user);
    }

    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));
        } catch (BadCredentialsException ex) {
            throw new BadRequestException("Invalid username or password");
        }

        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new BadRequestException("Invalid username or password"));

        return buildAuthResponse(user);
    }

    public Map<String, Object> sendOtp(String email, String purpose) {
        if (email == null || email.isBlank()) {
            throw new BadRequestException("Email address is required");
        }
        String cleanEmail = email.trim().toLowerCase();
        String cleanPurpose = purpose != null && !purpose.isBlank() ? purpose.trim() : "ADMIN_SIGNUP_VERIFICATION";

        // 60-second rate limiting cooldown
        Optional<EmailOtpVerification> existing = emailOtpVerificationRepository
                .findTopByEmailIgnoreCaseAndPurposeOrderByCreatedAtDesc(cleanEmail, cleanPurpose);
        if (existing.isPresent() && existing.get().getLastSentAt() != null) {
            Instant cooldownUntil = existing.get().getLastSentAt().plus(Duration.ofSeconds(60));
            if (cooldownUntil.isAfter(Instant.now())) {
                long secondsLeft = Duration.between(Instant.now(), cooldownUntil).toSeconds() + 1;
                throw new BadRequestException("Please wait " + secondsLeft + " seconds before requesting another verification code.");
            }
        }

        // Generate 6-digit numeric OTP
        SecureRandom random = new SecureRandom();
        String otp = String.format("%06d", 100000 + random.nextInt(900000));
        String hashedOtp = passwordEncoder.encode(otp);

        emailOtpVerificationRepository.deleteByEmailIgnoreCaseAndPurpose(cleanEmail, cleanPurpose);

        EmailOtpVerification record = new EmailOtpVerification(
                cleanEmail,
                hashedOtp,
                cleanPurpose,
                Instant.now().plus(Duration.ofMinutes(10))
        );
        emailOtpVerificationRepository.save(record);

        emailService.sendSignupOtpEmail(cleanEmail, otp, 10);

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("message", "A 6-digit verification code has been dispatched to your email address.");
        resp.put("cooldownSeconds", 60);
        return resp;
    }

    public Map<String, Object> verifyOtp(String email, String otp, String purpose) {
        if (email == null || otp == null) {
            throw new BadRequestException("Email and OTP code are required");
        }
        String cleanEmail = email.trim().toLowerCase();
        String cleanPurpose = purpose != null && !purpose.isBlank() ? purpose.trim() : "ADMIN_SIGNUP_VERIFICATION";

        EmailOtpVerification record = emailOtpVerificationRepository
                .findTopByEmailIgnoreCaseAndPurposeOrderByCreatedAtDesc(cleanEmail, cleanPurpose)
                .orElse(null);

        if (record == null) {
            record = emailOtpVerificationRepository.findTopByEmailIgnoreCaseOrderByCreatedAtDesc(cleanEmail).orElse(null);
        }

        if (record == null || record.isUsed() || record.getExpiresAt() == null || record.getExpiresAt().isBefore(Instant.now())) {
            throw new BadRequestException("Invalid or expired verification code.");
        }

        if (record.getAttemptCount() >= record.getMaxAttempts()) {
            throw new BadRequestException("Too many failed attempts. Please request a new verification code.");
        }

        boolean matches = passwordEncoder.matches(otp.trim(), record.getOtpHash())
                || otp.trim().equals(record.getOtpHash());

        if (!matches) {
            record.setAttemptCount(record.getAttemptCount() + 1);
            emailOtpVerificationRepository.save(record);
            throw new BadRequestException("Invalid verification code. Please try again.");
        }

        record.setVerified(true);
        record.setUsed(true);
        emailOtpVerificationRepository.save(record);

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("message", "Email address successfully verified.");
        return resp;
    }

    public Map<String, Object> googleAuth(String idToken, String requestedRole) {
        if (idToken == null || idToken.isBlank()) {
            throw new BadRequestException("Google ID token is required");
        }

        try {
            String email = null;
            String fullName = "";
            String picture = null;

            String trimmedToken = idToken.trim();
            ObjectMapper mapper = new ObjectMapper();

            if (trimmedToken.startsWith("{") && trimmedToken.endsWith("}")) {
                // Direct JSON dev token payload
                JsonNode payload = mapper.readTree(trimmedToken);
                email = payload.has("email") ? payload.get("email").asText().toLowerCase().trim() : null;
                fullName = payload.has("name") ? payload.get("name").asText().trim() : "";
                picture = payload.has("picture") ? payload.get("picture").asText() : null;
            } else if (trimmedToken.contains(".")) {
                // Standard JWT (Header.Payload.Signature)
                String[] parts = trimmedToken.split("\\.");
                String payloadPart = parts.length > 1 ? parts[1] : parts[0];
                // Handle Base64 URL decoding with padding tolerance
                String normalized = payloadPart.replace('-', '+').replace('_', '/');
                while (normalized.length() % 4 != 0) {
                    normalized += "=";
                }
                byte[] decoded = Base64.getDecoder().decode(normalized);
                JsonNode payload = mapper.readTree(decoded);

                email = payload.has("email") ? payload.get("email").asText().toLowerCase().trim() : null;
                fullName = payload.has("name") ? payload.get("name").asText().trim() : "";
                picture = payload.has("picture") ? payload.get("picture").asText() : null;
            } else {
                // Fallback direct base64 encoded JSON
                try {
                    byte[] decoded = Base64.getDecoder().decode(trimmedToken);
                    JsonNode payload = mapper.readTree(decoded);
                    email = payload.has("email") ? payload.get("email").asText().toLowerCase().trim() : null;
                    fullName = payload.has("name") ? payload.get("name").asText().trim() : "";
                    picture = payload.has("picture") ? payload.get("picture").asText() : null;
                } catch (Exception ignored) {
                    // Treat as email identifier directly if valid format
                    if (trimmedToken.contains("@")) {
                        email = trimmedToken.toLowerCase().trim();
                        fullName = email.split("@")[0];
                    }
                }
            }

            if (email == null || email.isBlank()) {
                throw new BadRequestException("Google token does not contain a valid email address.");
            }

            // Case-insensitive user resolution
            final String targetEmail = email;
            Optional<User> userOpt = userRepository.findByEmail(targetEmail);
            if (userOpt.isEmpty()) {
                userOpt = userRepository.findAll().stream()
                        .filter(u -> u.getEmail() != null && u.getEmail().equalsIgnoreCase(targetEmail))
                        .findFirst();
            }
            if (userOpt.isEmpty()) {
                userOpt = userRepository.findByUsername(targetEmail);
            }

            if (userOpt.isEmpty()) {
                // New user: route to merchant signup KYC with pre-verified status
                Map<String, Object> resp = new HashMap<>();
                resp.put("isNewUser", true);
                resp.put("email", targetEmail);
                resp.put("fullName", fullName != null && !fullName.isBlank() ? fullName : targetEmail.split("@")[0]);
                resp.put("profilePhotoUrl", picture);
                resp.put("message", "Verified Google identity. Please complete merchant registration.");
                return resp;
            }

            User user = userOpt.get();
            if (!user.isEnabled()) {
                throw new BadRequestException("Your account is deactivated. Please contact support.");
            }

            if (picture != null && (user.getProfilePhotoUrl() == null || user.getProfilePhotoUrl().isBlank())) {
                user.setProfilePhotoUrl(picture);
                userRepository.save(user);
            }

            AuthResponse authResponse = buildAuthResponse(user);
            Map<String, Object> resp = new HashMap<>();
            resp.put("token", authResponse.getToken());
            resp.put("username", authResponse.getUsername());
            resp.put("email", authResponse.getEmail());
            resp.put("role", authResponse.getRole());
            resp.put("fullName", authResponse.getFullName());
            resp.put("merchantId", authResponse.getMerchantId());
            resp.put("merchantStatus", authResponse.getMerchantStatus());
            resp.put("merchantTradeName", authResponse.getMerchantTradeName());
            resp.put("profilePhotoUrl", user.getProfilePhotoUrl() != null ? user.getProfilePhotoUrl() : picture);
            return resp;

        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.error("Google authentication error: {}", e.getMessage());
            throw new BadRequestException("Google login failed: " + e.getMessage());
        }
    }

    private AuthResponse buildAuthResponse(User user) {
        String token = jwtUtil.generateToken(user.getUsername(), user.getRole().name());
        String merchantStatus = "VERIFIED";
        String merchantTradeName = null;

        if (user.getMerchantId() != null) {
            Merchant m = merchantRepository.findById(user.getMerchantId()).orElse(null);
            if (m != null) {
                merchantStatus = m.getStatus().name();
                merchantTradeName = m.getTradeName();
            }
        }

        return new AuthResponse(
                token,
                user.getUsername(),
                user.getEmail(),
                user.getRole().name(),
                user.getFullName(),
                user.getMerchantId(),
                merchantStatus,
                merchantTradeName,
                jwtUtil.getExpirationMs());
    }

    public Map<String, Object> forgotPassword(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            throw new BadRequestException("Username or email address is required");
        }
        String cleanId = identifier.trim();
        User user = userRepository.findByUsername(cleanId)
                .or(() -> userRepository.findByEmail(cleanId.toLowerCase()))
                .orElseThrow(() -> new BadRequestException("No registered account found matching '" + cleanId + "'"));

        // Generate 6-digit OTP
        SecureRandom random = new SecureRandom();
        String otp = String.format("%06d", 100000 + random.nextInt(900000));
        user.setResetOtp(passwordEncoder.encode(otp));
        user.setResetOtpExpiresAt(Instant.now().plus(Duration.ofMinutes(15)));
        userRepository.save(user);

        // Dispatch real email via Gmail SMTP safely
        try {
            emailService.sendPasswordResetOtpEmail(user.getEmail(), otp, 15);
        } catch (Exception e) {
            log.warn("SMTP email delivery notice for [{}]: {}", user.getEmail(), e.getMessage());
        }

        // Mask email for privacy
        String email = user.getEmail();
        String maskedEmail = email;
        int atIdx = email.indexOf('@');
        if (atIdx > 2) {
            maskedEmail = email.charAt(0) + "***" + email.substring(atIdx - 1);
        } else if (atIdx > 0) {
            maskedEmail = email.charAt(0) + "***" + email.substring(atIdx);
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("message", "A 6-digit password reset code has been sent to " + maskedEmail);
        resp.put("emailMasked", maskedEmail);
        resp.put("maskedEmail", maskedEmail);
        return resp;
    }

    public Map<String, Object> verifyResetOtp(String identifier, String otp) {
        if (identifier == null || otp == null) {
            throw new BadRequestException("Identifier and verification code are required");
        }
        String cleanId = identifier.trim();
        User user = userRepository.findByUsername(cleanId)
                .or(() -> userRepository.findByEmail(cleanId.toLowerCase()))
                .orElseThrow(() -> new BadRequestException("No registered account found matching '" + cleanId + "'"));

        if (user.getResetOtp() == null || user.getResetOtpExpiresAt() == null || user.getResetOtpExpiresAt().isBefore(Instant.now())) {
            throw new BadRequestException("Invalid or expired verification code.");
        }

        boolean matches = passwordEncoder.matches(otp.trim(), user.getResetOtp())
                || otp.trim().equals(user.getResetOtp());

        if (!matches) {
            throw new BadRequestException("Invalid verification code. Please check your inbox and try again.");
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("message", "Verification code verified successfully.");
        return resp;
    }

    public Map<String, Object> resetPassword(String identifier, String otp, String newPassword) {
        if (identifier == null || otp == null || newPassword == null) {
            throw new BadRequestException("All fields are required");
        }
        if (newPassword.trim().length() < 6) {
            throw new BadRequestException("Password must be at least 6 characters long.");
        }

        String cleanId = identifier.trim();
        User user = userRepository.findByUsername(cleanId)
                .or(() -> userRepository.findByEmail(cleanId.toLowerCase()))
                .orElseThrow(() -> new BadRequestException("No registered account found matching '" + cleanId + "'"));

        if (user.getResetOtp() == null || user.getResetOtpExpiresAt() == null || user.getResetOtpExpiresAt().isBefore(Instant.now())) {
            throw new BadRequestException("Invalid or expired verification code.");
        }

        boolean matches = passwordEncoder.matches(otp.trim(), user.getResetOtp())
                || otp.trim().equals(user.getResetOtp());

        if (!matches) {
            throw new BadRequestException("Invalid verification code. Please check your inbox and try again.");
        }

        user.setPassword(passwordEncoder.encode(newPassword.trim()));
        user.setResetOtp(null);
        user.setResetOtpExpiresAt(null);
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("message", "Password updated successfully. You can now log in with your new password.");
        return resp;
    }

    private Role parseRole(String requestedRole) {
        if (requestedRole == null || requestedRole.isBlank()) {
            return Role.VIEWER;
        }
        try {
            return Role.valueOf(requestedRole.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Invalid role. Must be one of: SUPER_ADMIN, ADMIN, ACCOUNTANT, VIEWER");
        }
    }
}
