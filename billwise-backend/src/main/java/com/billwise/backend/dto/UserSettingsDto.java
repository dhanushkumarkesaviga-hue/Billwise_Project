package com.billwise.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserSettingsDto {

    private Map<String, Object> notificationPreferences;
    private String themePreference;
}
