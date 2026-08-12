package com.billwise.auth.dto;

import com.billwise.common.entity.Role;
import com.billwise.common.util.GstValidationUtil;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

public class MerchantDtos {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MerchantSignupRequest {
        @NotBlank(message = "Legal business name is required")
        private String legalName;

        @NotBlank(message = "Trade / display name is required")
        private String tradeName;

        @NotBlank(message = "GSTIN is required")
        private String gstin;

        private String pan;

        private String businessType = "Proprietorship";

        @NotBlank(message = "Registered address is required")
        private String registeredAddress;

        private String state;

        private String stateCode;

        private String pincode;

        @NotBlank(message = "Contact email is required")
        private String contactEmail;

        @NotBlank(message = "Contact phone is required")
        private String contactPhone;

        private String gstCertificateUrl;
        private String shopLicenseUrl;
        private String storefrontPhotoUrl;

        @NotBlank(message = "Admin username is required")
        @Size(min = 3, max = 50)
        private String adminUsername;

        private String adminEmail;

        @NotBlank(message = "Admin password is required")
        @Size(min = 6, message = "Password must be at least 6 characters")
        private String adminPassword;

        private String adminFullName;
        private String adminPhone;
        private String emailOtp;

        public String getResolvedPan() {
            if (pan != null && !pan.isBlank()) return pan.trim().toUpperCase();
            return GstValidationUtil.extractPan(gstin);
        }

        public String getResolvedStateCode() {
            if (stateCode != null && !stateCode.isBlank()) return stateCode.trim();
            return GstValidationUtil.extractStateCode(gstin);
        }

        public String getResolvedAdminEmail() {
            if (adminEmail != null && !adminEmail.isBlank()) return adminEmail.trim();
            return contactEmail != null ? contactEmail.trim() : adminUsername + "@billwise.app";
        }
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VerificationActionRequest {
        private String reason;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StaffCreateRequest {
        @NotBlank(message = "Username is required")
        private String username;

        @NotBlank(message = "Email is required")
        private String email;

        @NotBlank(message = "Password is required")
        @Size(min = 6)
        private String password;

        private String fullName;
        private String phone;

        private Role role = Role.ACCOUNTANT;
    }
}
