package com.billwise.auth.controller;

import com.billwise.auth.dto.UserDtos.ChangePasswordRequest;
import com.billwise.auth.dto.UserDtos.UpdateProfileRequest;
import com.billwise.auth.dto.UserDtos.UserProfileDto;
import com.billwise.auth.entity.UserSettings;
import com.billwise.auth.security.UserPrincipal;
import com.billwise.auth.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserProfileDto> getMyProfile(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(userService.getProfile(principal.getUsername()));
    }

    @PostMapping("/me/send-email-change-otp")
    public ResponseEntity<Map<String, Object>> sendEmailChangeOtp(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, String> body
    ) {
        String newEmail = body.get("newEmail");
        return ResponseEntity.ok(userService.sendEmailChangeOtp(principal.getUsername(), newEmail));
    }

    @PutMapping("/me")
    public ResponseEntity<UserProfileDto> updateMyProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        return ResponseEntity.ok(userService.updateProfile(principal.getUsername(), request));
    }

    @PutMapping("/me/password")
    public ResponseEntity<Map<String, String>> changeMyPassword(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        userService.changePassword(principal.getUsername(), request);
        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }

    @GetMapping("/me/settings")
    public ResponseEntity<UserSettings> getMySettings(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(userService.getSettings(principal.getUsername()));
    }

    @PutMapping("/me/settings")
    public ResponseEntity<UserSettings> updateMySettings(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody UserSettings settings
    ) {
        return ResponseEntity.ok(userService.updateSettings(principal.getUsername(), settings));
    }
}
