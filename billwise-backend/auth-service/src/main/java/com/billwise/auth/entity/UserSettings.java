package com.billwise.auth.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserSettings {

    private boolean emailAlerts = true;

    private boolean smsAlerts = true;

    private boolean deadlineReminders = true;

    private boolean autoOcrClassification = true;

    private boolean twoFactorAuth = false;

    private String language = "English";

    private String currency = "INR (₹)";

    private String theme = "Light";
}
