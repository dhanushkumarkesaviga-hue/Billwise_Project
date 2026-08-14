package com.billwise.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MerchantSignupRequest {

    // Business details
    @NotBlank(message = "Legal business name is required")
    private String legalName;

    @NotBlank(message = "Trade name is required")
    private String tradeName;

    @NotBlank(message = "GSTIN is required")
    private String gstin;

    private String businessType; // Proprietorship, Private Limited, etc.

    @NotBlank(message = "Registered business address is required")
    private String registeredAddress;

    private String state;

    private String pincode;

    // GST Compliance Profile
    private String taxpayerType = "REGULAR"; // REGULAR, COMPOSITION, ISD

    private String turnoverSlab = "UP_TO_1_5_CR"; // UP_TO_1_5_CR, 1_5_TO_5_CR, ABOVE_5_CR

    private String filingFrequency = "MONTHLY"; // MONTHLY, QRMP_QUARTERLY

    private Boolean emailRemindersEnabled = true;

    // Contact details
    @NotBlank(message = "Contact email is required")
    @Email(message = "Invalid contact email")
    private String contactEmail;

    @NotBlank(message = "Contact phone is required")
    private String contactPhone;

    // Documents (Base64 data URLs or uploaded paths)
    @NotBlank(message = "GST Certificate document is required")
    private String gstCertificateUrl;

    private String shopLicenseUrl;

    private String storefrontPhotoUrl;

    // Owner / Admin account details
    @NotBlank(message = "Admin full name is required")
    private String adminFullName;

    @NotBlank(message = "Admin username is required")
    private String adminUsername;

    @NotBlank(message = "Admin password is required")
    private String adminPassword;

    // Google Identity / Email OTP Verification
    private String googleIdToken;
    private String emailOtp;
}
