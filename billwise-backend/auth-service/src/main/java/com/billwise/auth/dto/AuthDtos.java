package com.billwise.auth.dto;

import com.billwise.common.entity.MerchantStatus;
import com.billwise.common.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

public class AuthDtos {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AuthRequest {
        @NotBlank(message = "Username is required")
        private String username;

        @NotBlank(message = "Password is required")
        private String password;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RegisterRequest {
        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 50)
        private String username;

        @NotBlank(message = "Email is required")
        @Email(message = "Valid email is required")
        private String email;

        @NotBlank(message = "Password is required")
        @Size(min = 6, message = "Password must be at least 6 characters")
        private String password;

        private String fullName;

        private String phone;

        private String merchantId;

        private String adminUsername;

        private Role role = Role.ACCOUNTANT;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AuthResponse {
        private String token;
        private String username;
        private String email;
        private String fullName;
        private Role role;
        private String merchantId;
        private MerchantStatus merchantStatus;
        private String merchantTradeName;
        private String profilePhotoUrl;
        private boolean accountantVerified = true;
        private String adminUsername;
        private boolean isNewUser = false;

        public AuthResponse(String token, String username, String email, String fullName, Role role,
                            String merchantId, MerchantStatus merchantStatus, String merchantTradeName,
                            String profilePhotoUrl) {
            this.token = token;
            this.username = username;
            this.email = email;
            this.fullName = fullName;
            this.role = role;
            this.merchantId = merchantId;
            this.merchantStatus = merchantStatus;
            this.merchantTradeName = merchantTradeName;
            this.profilePhotoUrl = profilePhotoUrl;
            this.accountantVerified = true;
            this.adminUsername = username;
            this.isNewUser = false;
        }

        public AuthResponse(String token, String username, String email, String fullName, Role role,
                            String merchantId, MerchantStatus merchantStatus, String merchantTradeName,
                            String profilePhotoUrl, boolean accountantVerified, String adminUsername) {
            this.token = token;
            this.username = username;
            this.email = email;
            this.fullName = fullName;
            this.role = role;
            this.merchantId = merchantId;
            this.merchantStatus = merchantStatus;
            this.merchantTradeName = merchantTradeName;
            this.profilePhotoUrl = profilePhotoUrl;
            this.accountantVerified = accountantVerified;
            this.adminUsername = adminUsername;
            this.isNewUser = false;
        }

        public static AuthResponse newUser(String email, String fullName) {
            AuthResponse resp = new AuthResponse();
            resp.setNewUser(true);
            resp.setEmail(email);
            resp.setFullName(fullName);
            return resp;
        }
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GoogleAuthRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Valid email is required")
        private String email;

        private String name;
        private String googleId;
        private String avatar;
        private String idToken;
        private Role role = Role.ADMIN;
        private String adminUsername;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ForgotPasswordRequest {
        @NotBlank(message = "Email or username is required")
        private String identifier;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VerifyOtpRequest {
        @NotBlank(message = "Email or username is required")
        private String identifier;

        @NotBlank(message = "OTP code is required")
        private String otp;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResetPasswordRequest {
        @NotBlank(message = "Email or username is required")
        private String identifier;

        @NotBlank(message = "OTP code is required")
        private String otp;

        @NotBlank(message = "New password is required")
        @Size(min = 6, message = "Password must be at least 6 characters")
        private String newPassword;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ForgotPasswordResponse {
        private boolean success;
        private String message;
        private String emailMasked;
        private String devOtp;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SendOtpRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Valid email is required")
        private String email;

        private String purpose = "ADMIN_SIGNUP_VERIFICATION";
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SendOtpResponse {
        private boolean success;
        private String message;
        private String devOtp;
        private int cooldownSeconds = 60;

        public SendOtpResponse(boolean success, String message, String devOtp) {
            this.success = success;
            this.message = message;
            this.devOtp = devOtp;
            this.cooldownSeconds = 60;
        }
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VerifySignupOtpRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Valid email is required")
        private String email;

        @NotBlank(message = "OTP code is required")
        private String otp;

        private String purpose = "ADMIN_SIGNUP_VERIFICATION";
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PasswordResetSubmitRequest {
        @NotBlank(message = "Username or email is required")
        private String identifier;

        @NotBlank(message = "New password is required")
        @Size(min = 6, message = "Password must be at least 6 characters")
        private String newPassword;

        private String phone;
        private String reason;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PasswordResetStatusResponse {
        private boolean found;
        private String status;
        private String username;
        private String adminUsername;
        private String message;
        private java.time.Instant createdAt;
        private java.time.Instant reviewedAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PasswordResetActionRequest {
        private String note;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PasswordResetDto {
        private String id;
        private String userId;
        private String username;
        private String email;
        private String fullName;
        private String phone;
        private Role role;
        private String merchantId;
        private String adminUsername;
        private String status;
        private String reason;
        private String adminNote;
        private String reviewedByAdmin;
        private java.time.Instant createdAt;
        private java.time.Instant reviewedAt;
    }
}

