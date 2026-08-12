package com.billwise.auth.service;

import com.billwise.auth.dto.UserDtos.ChangePasswordRequest;
import com.billwise.auth.dto.UserDtos.UpdateProfileRequest;
import com.billwise.auth.dto.UserDtos.UserProfileDto;
import com.billwise.auth.entity.Merchant;
import com.billwise.auth.entity.User;
import com.billwise.auth.entity.UserSettings;
import com.billwise.auth.repository.MerchantRepository;
import com.billwise.auth.repository.UserRepository;
import com.billwise.common.exception.BadRequestException;
import com.billwise.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final MerchantRepository merchantRepository;
    private final PasswordEncoder passwordEncoder;

    public UserProfileDto getProfile(String username) {
        User user = getUser(username);
        Merchant merchant = user.getMerchantId() != null
                ? merchantRepository.findById(user.getMerchantId()).orElse(null)
                : null;

        return toProfileDto(user, merchant);
    }

    public UserProfileDto updateProfile(String username, UpdateProfileRequest req) {
        User user = getUser(username);

        if (req.getFullName() != null) user.setFullName(req.getFullName());
        if (req.getPhone() != null) user.setPhone(req.getPhone());
        if (req.getProfilePhotoUrl() != null) user.setProfilePhotoUrl(req.getProfilePhotoUrl());

        if (req.getEmail() != null && !req.getEmail().equalsIgnoreCase(user.getEmail())) {
            if (userRepository.existsByEmail(req.getEmail())) {
                throw new BadRequestException("Email " + req.getEmail() + " is already in use.");
            }
            user.setEmail(req.getEmail());
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
