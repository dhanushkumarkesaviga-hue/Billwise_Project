package com.billwise.backend.dto;

import com.billwise.backend.entity.Role;
import com.billwise.backend.entity.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {

    private String id;
    private String username;
    private String email;
    private String fullName;
    private String phone;
    private Role role;
    private String merchantId;
    private String profilePhotoUrl;
    private boolean enabled;
    private Map<String, Object> notificationPreferences;
    private String themePreference;
    private MerchantResponse merchant; // Embedded current merchant info if applicable
    private Instant createdAt;

    public static UserProfileResponse fromEntity(User user, MerchantResponse merchant) {
        if (user == null) return null;
        return new UserProfileResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getPhone(),
                user.getRole(),
                user.getMerchantId(),
                user.getProfilePhotoUrl(),
                user.isEnabled(),
                user.getNotificationPreferences(),
                user.getThemePreference(),
                merchant,
                user.getCreatedAt()
        );
    }
}
