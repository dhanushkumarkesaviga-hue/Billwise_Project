package com.billwise.auth.entity;

import com.billwise.common.entity.MerchantStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "merchants")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Merchant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @NotBlank
    @Column(nullable = false)
    private String legalName;

    @NotBlank
    @Column(nullable = false)
    private String tradeName;

    @NotBlank
    @Column(unique = true, nullable = false)
    private String gstin;

    @NotBlank
    @Column(nullable = false)
    private String pan;

    @NotBlank
    @Column(nullable = false)
    private String businessType;

    @NotBlank
    @Column(nullable = false, length = 1000)
    private String registeredAddress;

    @NotBlank
    @Column(nullable = false)
    private String state;

    @NotBlank
    @Column(nullable = false)
    private String stateCode;

    @NotBlank
    @Column(nullable = false)
    private String pincode;

    @NotBlank
    @Column(nullable = false)
    private String contactEmail;

    @NotBlank
    @Column(nullable = false)
    private String contactPhone;

    @Lob
    @Column(name = "gst_certificate_url", columnDefinition = "LONGTEXT")
    private String gstCertificateUrl;

    @Lob
    @Column(name = "shop_license_url", columnDefinition = "LONGTEXT")
    private String shopLicenseUrl;

    @Lob
    @Column(name = "storefront_photo_url", columnDefinition = "LONGTEXT")
    private String storefrontPhotoUrl;

    private boolean emailVerified = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MerchantStatus status = MerchantStatus.PENDING_VERIFICATION;

    @Lob
    @Column(name = "rejection_reason", columnDefinition = "LONGTEXT")
    private String rejectionReason;

    private String adminUsername;

    private String verifiedBy;

    private Instant verifiedAt;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "merchant_warning_flags", joinColumns = @JoinColumn(name = "merchant_id"))
    @Column(name = "flag")
    private List<String> duplicateWarningFlags = new ArrayList<>();

    private Instant createdAt = Instant.now();

    private Instant updatedAt = Instant.now();
}
