package com.billwise.backend.controller;

import com.billwise.backend.dto.AuthResponse;
import com.billwise.backend.dto.LoginRequest;
import com.billwise.backend.dto.RegisterRequest;
import com.billwise.backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping({"/send-otp", "/send-signup-otp"})
    public ResponseEntity<Map<String, Object>> sendOtp(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String purpose = body.getOrDefault("purpose", "ADMIN_SIGNUP_VERIFICATION");
        return ResponseEntity.ok(authService.sendOtp(email, purpose));
    }

    @PostMapping({"/verify-otp", "/verify-signup-otp"})
    public ResponseEntity<Map<String, Object>> verifyOtp(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String otp = body.get("otp");
        String purpose = body.getOrDefault("purpose", "ADMIN_SIGNUP_VERIFICATION");
        return ResponseEntity.ok(authService.verifyOtp(email, otp, purpose));
    }

    @PostMapping("/google")
    public ResponseEntity<Map<String, Object>> googleAuth(@RequestBody Map<String, String> body) {
        String idToken = body.get("idToken");
        String role = body.get("role");
        return ResponseEntity.ok(authService.googleAuth(idToken, role));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, Object>> forgotPassword(@RequestBody Map<String, String> body) {
        String identifier = body.get("identifier");
        return ResponseEntity.ok(authService.forgotPassword(identifier));
    }

    @PostMapping("/verify-reset-otp")
    public ResponseEntity<Map<String, Object>> verifyResetOtp(@RequestBody Map<String, String> body) {
        String identifier = body.get("identifier");
        String otp = body.get("otp");
        return ResponseEntity.ok(authService.verifyResetOtp(identifier, otp));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(@RequestBody Map<String, String> body) {
        String identifier = body.get("identifier");
        String otp = body.get("otp");
        String newPassword = body.get("newPassword");
        return ResponseEntity.ok(authService.resetPassword(identifier, otp, newPassword));
    }

    // Lets the frontend restore session state (username/role) after a page
    // refresh just by re-sending the stored token, without a full login.
    @GetMapping("/me")
    public Map<String, Object> me() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return Map.of(
                "username", authentication.getName(),
                "role", authentication.getAuthorities().stream().findFirst()
                        .map(a -> a.getAuthority().replace("ROLE_", ""))
                        .orElse("VIEWER"));
    }
}
