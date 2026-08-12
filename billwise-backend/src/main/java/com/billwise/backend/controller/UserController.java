package com.billwise.backend.controller;

import com.billwise.backend.dto.ChangePasswordRequest;
import com.billwise.backend.dto.UpdateProfileRequest;
import com.billwise.backend.dto.UserProfileResponse;
import com.billwise.backend.dto.UserSettingsDto;
import com.billwise.backend.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * Get profile of logged-in user with linked merchant info & verification status.
     */
    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getMyProfile(Principal principal) {
        return ResponseEntity.ok(userService.getProfile(principal.getName()));
    }

    /**
     * Update profile details (name, email, phone, avatar).
     */
    @PutMapping("/me")
    public ResponseEntity<UserProfileResponse> updateProfile(
            Principal principal,
            @Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(userService.updateProfile(principal.getName(), request));
    }

    /**
     * Change account password with current password verification.
     */
    @PutMapping("/me/password")
    public ResponseEntity<Map<String, String>> changePassword(
            Principal principal,
            @Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(principal.getName(), request);
        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }

    /**
     * Get user settings (notification preferences, UI theme).
     */
    @GetMapping("/me/settings")
    public ResponseEntity<UserSettingsDto> getSettings(Principal principal) {
        return ResponseEntity.ok(userService.getSettings(principal.getName()));
    }

    /**
     * Update user settings.
     */
    @PutMapping("/me/settings")
    public ResponseEntity<UserSettingsDto> updateSettings(
            Principal principal,
            @RequestBody UserSettingsDto request) {
        return ResponseEntity.ok(userService.updateSettings(principal.getName(), request));
    }
}
