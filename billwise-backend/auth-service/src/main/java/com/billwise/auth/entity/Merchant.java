package com.billwise.auth.entity;

import com.billwise.common.entity.MerchantStatus;
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

    @NotBlank
    private String businessType;

    @NotBlank
    private String registeredAddress;

    @NotBlank
    private String state;

    @NotBlank
    private String stateCode;

    @NotBlank
    private String pincode;

    @NotBlank
    private String contactEmail;

    @NotBlank
    private String contactPhone;

    private String gstCertificateUrl;

    private String shopLicenseUrl;

    private String storefrontPhotoUrl;

    private boolean emailVerified = false;

    private MerchantStatus status = MerchantStatus.PENDING_VERIFICATION;

    private String rejectionReason;

    private String adminUsername;

    private String verifiedBy;

    private Instant verifiedAt;

    private List<String> duplicateWarningFlags = new ArrayList<>();

    private Instant createdAt = Instant.now();

    private Instant updatedAt = Instant.now();
}
