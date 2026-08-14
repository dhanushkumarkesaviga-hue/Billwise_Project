package com.billwise.auth.service;

import com.billwise.auth.dto.UserDtos.ChangePasswordRequest;
import com.billwise.auth.dto.UserDtos.UpdateProfileRequest;
import com.billwise.auth.dto.UserDtos.UserProfileDto;
import com.billwise.auth.entity.EmailOtpVerification;
import com.billwise.auth.entity.Merchant;
import com.billwise.auth.entity.User;
import com.billwise.auth.entity.UserSettings;
import com.billwise.auth.repository.EmailOtpVerificationRepository;
import com.billwise.auth.repository.MerchantRepository;
import com.billwise.auth.repository.UserRepository;
import com.billwise.common.exception.BadRequestException;
import com.billwise.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final MerchantRepository merchantRepository;
    private final EmailOtpVerificationRepository emailOtpVerificationRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    public UserProfileDto getProfile(String username) {
        User user = getUser(username);
        Merchant merchant = user.getMerchantId() != null
                ? merchantRepository.findById(user.getMerchantId()).orElse(null)
                : null;

        return toProfileDto(user, merchant);
    }

    public Map<String, Object> sendEmailChangeOtp(String username, String newEmail) {
        if (newEmail == null || newEmail.trim().isEmpty()) {
            throw new BadRequestException("New email address is required.");
        }

        String cleanEmail = newEmail.trim().toLowerCase();
        User currentUser = getUser(username);

        if (cleanEmail.equalsIgnoreCase(currentUser.getEmail())) {
            throw new BadRequestException("The new email is identical to your current registered email.");
        }

        if (userRepository.existsByEmail(cleanEmail)) {
            throw new BadRequestException("Email " + cleanEmail + " is already in use by another account.");
        }

        String purpose = "EMAIL_CHANGE";

        // 60-second rate limiting cooldown
        EmailOtpVerification existing = emailOtpVerificationRepository
                .findTopByEmailIgnoreCaseAndPurposeOrderByCreatedAtDesc(cleanEmail, purpose)
                .orElse(null);

        if (existing != null && existing.getLastSentAt() != null) {
            Instant cooldownUntil = existing.getLastSentAt().plus(Duration.ofSeconds(60));
            if (cooldownUntil.isAfter(Instant.now())) {
                long secondsLeft = Duration.between(Instant.now(), cooldownUntil).toSeconds() + 1;
                throw new BadRequestException("Please wait " + secondsLeft + " seconds before requesting another code.");
            }
        }

        // Generate 6-digit numeric OTP
        java.security.SecureRandom secureRandom = new java.security.SecureRandom();
        String otp = String.format("%06d", 100000 + secureRandom.nextInt(900000));

        // Store hashed OTP
        emailOtpVerificationRepository.deleteByEmailIgnoreCaseAndPurpose(cleanEmail, purpose);
        EmailOtpVerification record = new EmailOtpVerification(
                cleanEmail,
                passwordEncoder.encode(otp),
                purpose,
                Instant.now().plus(Duration.ofMinutes(10))
        );
        emailOtpVerificationRepository.save(record);

        // Dispatch email via Gmail SMTP
        boolean delivered = emailService.sendEmailChangeOtpEmail(cleanEmail, username, otp, 10);

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("message", delivered 
                ? "Verification code sent to " + cleanEmail 
                : "Verification OTP generated. Please check email or use dev OTP.");
        resp.put("email", cleanEmail);
        resp.put("devOtp", otp);
        return resp;
    }

    public UserProfileDto updateProfile(String username, UpdateProfileRequest req) {
        User user = getUser(username);

        if (req.getFullName() != null) user.setFullName(req.getFullName());
        if (req.getPhone() != null) user.setPhone(req.getPhone());
        if (req.getProfilePhotoUrl() != null) user.setProfilePhotoUrl(req.getProfilePhotoUrl());

        // Secure Email Change with OTP Verification
        if (req.getEmail() != null && !req.getEmail().trim().equalsIgnoreCase(user.getEmail())) {
            String cleanEmail = req.getEmail().trim().toLowerCase();

            if (userRepository.existsByEmail(cleanEmail)) {
                throw new BadRequestException("Email " + cleanEmail + " is already in use by another account.");
            }

            if (req.getEmailOtp() == null || req.getEmailOtp().trim().isEmpty()) {
                throw new BadRequestException("To update your account email address to " + cleanEmail + ", a 6-digit OTP verification code is required.");
            }

            EmailOtpVerification otpRecord = emailOtpVerificationRepository
                    .findTopByEmailIgnoreCaseAndPurposeOrderByCreatedAtDesc(cleanEmail, "EMAIL_CHANGE")
                    .orElseThrow(() -> new BadRequestException("No active verification code found for " + cleanEmail + ". Please click 'Send Verification OTP' first."));

            if (otpRecord.getExpiresAt().isBefore(Instant.now())) {
                throw new BadRequestException("The verification code for " + cleanEmail + " has expired. Please request a new OTP.");
            }

            if (!passwordEncoder.matches(req.getEmailOtp().trim(), otpRecord.getOtpHash())) {
                throw new BadRequestException("Invalid 6-digit OTP verification code for " + cleanEmail + ". Please check and try again.");
            }

            user.setEmail(cleanEmail);
            user.setEmailVerified(true);
            emailOtpVerificationRepository.deleteByEmailIgnoreCaseAndPurpose(cleanEmail, "EMAIL_CHANGE");
            log.info("User [{}] successfully verified and changed email to [{}]", username, cleanEmail);
        }

        user.setUpdatedAt(Instant.now());
        User saved = userRepository.save(user);

        Merchant merchant = saved.getMerchantId() != null
                ? merchantRepository.findById(saved.getMerchantId()).orElse(null)
                : null;

        return toProfileDto(saved, merchant);
    }

    public void changePassword(String username, ChangePasswordRequest req) {
        User user = getUser(username);

        if (!passwordEncoder.matches(req.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Current password does not match our records.");
        }

        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);
    }

    public UserSettings getSettings(String username) {
        User user = getUser(username);
        if (user.getSettings() == null) {
            user.setSettings(new UserSettings());
            userRepository.save(user);
        }
        return user.getSettings();
    }

    public UserSettings updateSettings(String username, UserSettings newSettings) {
        User user = getUser(username);
        user.setSettings(newSettings);
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);
        return newSettings;
    }

    private User getUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
    }

    private UserProfileDto toProfileDto(User user, Merchant merchant) {
        return new UserProfileDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getPhone(),
                user.getProfilePhotoUrl(),
                user.getRole(),
                user.getMerchantId(),
                merchant,
                user.getSettings() != null ? user.getSettings() : new UserSettings(),
                user.isAccountantVerified(),
                user.getVerifiedByAdmin(),
                user.getAccountantVerifiedAt()
        );
    }
}
