package com.billwise.auth.dto;

import com.billwise.auth.entity.Merchant;
import com.billwise.auth.entity.UserSettings;
import com.billwise.common.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

public class UserDtos {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateProfileRequest {
        private String fullName;

        @Email
        private String email;

        private String phone;
        private String profilePhotoUrl;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChangePasswordRequest {
        @NotBlank(message = "Current password is required")
        private String currentPassword;

        @NotBlank(message = "New password is required")
        @Size(min = 6, message = "New password must be at least 6 characters")
        private String newPassword;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserProfileDto {
        private String id;
        private String username;
        private String email;
        private String fullName;
        private String phone;
        private String profilePhotoUrl;
        private Role role;
        private String merchantId;
        private Merchant merchant;
        private UserSettings settings;
        private boolean accountantVerified;
        private String verifiedByAdmin;
        private java.time.Instant accountantVerifiedAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StaffUserDto {
        private String id;
        private String username;
        private String email;
        private String fullName;
        private String phone;
        private String profilePhotoUrl;
        private Role role;
        private boolean enabled;
        private boolean accountantVerified;
        private String verifiedByAdmin;
        private java.time.Instant accountantVerifiedAt;
    }
}
