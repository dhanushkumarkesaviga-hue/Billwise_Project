package com.billwise.backend.service;

import com.billwise.backend.dto.*;
import com.billwise.backend.entity.Merchant;
import com.billwise.backend.entity.User;
import com.billwise.backend.exception.BadRequestException;
import com.billwise.backend.repository.MerchantRepository;
import com.billwise.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final MerchantRepository merchantRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Get user profile details, assigned role, and linked merchant verification status.
     */
    public UserProfileResponse getProfile(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BadRequestException("User not found: " + username));

        MerchantResponse merchantRes = null;
        if (user.getMerchantId() != null) {
            Merchant m = merchantRepository.findById(user.getMerchantId()).orElse(null);
            merchantRes = MerchantResponse.fromEntity(m);
        }

        return UserProfileResponse.fromEntity(user, merchantRes);
    }

    /**
     * Update profile (full name, email, phone, profile avatar).
     */
    public UserProfileResponse updateProfile(String username, UpdateProfileRequest req) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BadRequestException("User not found"));

        if (req.getEmail() != null && !req.getEmail().equalsIgnoreCase(user.getEmail())) {
            String newEmail = req.getEmail().trim().toLowerCase();
            if (userRepository.existsByEmail(newEmail)) {
                throw new BadRequestException("Email " + newEmail + " is already in use by another user.");
            }
            user.setEmail(newEmail);
        }

        if (req.getFullName() != null) user.setFullName(req.getFullName().trim());
        if (req.getPhone() != null) user.setPhone(req.getPhone().trim());
        if (req.getProfilePhotoUrl() != null) user.setProfilePhotoUrl(req.getProfilePhotoUrl());

        user.setUpdatedAt(Instant.now());
        User saved = userRepository.save(user);

        MerchantResponse merchantRes = null;
        if (saved.getMerchantId() != null) {
            Merchant m = merchantRepository.findById(saved.getMerchantId()).orElse(null);
            merchantRes = MerchantResponse.fromEntity(m);
        }

        return UserProfileResponse.fromEntity(saved, merchantRes);
    }

    /**
     * Change password with mandatory current password confirmation.
     */
    public void changePassword(String username, ChangePasswordRequest req) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BadRequestException("User not found"));

        if (!passwordEncoder.matches(req.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Current password does not match our records.");
        }

        if (req.getNewPassword() == null || req.getNewPassword().length() < 6) {
            throw new BadRequestException("New password must be at least 6 characters long.");
        }

        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);
        log.info("Password successfully updated for user: {}", username);
    }

    /**
     * Get user notification preferences & UI theme.
     */
    public UserSettingsDto getSettings(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BadRequestException("User not found"));

        return new UserSettingsDto(
                user.getNotificationPreferences() != null ? user.getNotificationPreferences() : new HashMap<>(),
                user.getThemePreference() != null ? user.getThemePreference() : "light"
        );
    }

    /**
     * Update user notification preferences & UI theme.
     */
    public UserSettingsDto updateSettings(String username, UserSettingsDto req) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BadRequestException("User not found"));

        if (req.getNotificationPreferences() != null) {
            user.setNotificationPreferences(req.getNotificationPreferences());
        }
        if (req.getThemePreference() != null && !req.getThemePreference().isBlank()) {
            user.setThemePreference(req.getThemePreference().trim());
        }

        user.setUpdatedAt(Instant.now());
        User saved = userRepository.save(user);

        return new UserSettingsDto(saved.getNotificationPreferences(), saved.getThemePreference());
    }
}
