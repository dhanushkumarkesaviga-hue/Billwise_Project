package com.billwise.backend.entity;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "merchants")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Merchant {

    @Id
    private String id;

    @NotBlank
    private String legalName;

    @NotBlank
    private String tradeName;

    @NotBlank
    @Indexed(unique = true)
    private String gstin;

    @NotBlank
    @Indexed
    private String pan;

    private String businessType; // Proprietorship, Partnership, Private Limited, LLP, Public Limited, etc.

    private String registeredAddress;

    private String state;

    private String stateCode;

    private String pincode;

    private String contactEmail;

    private String contactPhone;

    // Document proof URLs / base64 strings
    private String gstCertificateUrl;

    private String shopLicenseUrl;

    private String storefrontPhotoUrl;

    private MerchantStatus status = MerchantStatus.PENDING_VERIFICATION;

    private String rejectionReason;

    private List<String> duplicateWarningFlags = new ArrayList<>();

    private String adminUsername;

    private Instant verifiedAt;

    private String verifiedBy;

    private Instant createdAt = Instant.now();

    private Instant updatedAt = Instant.now();
}
