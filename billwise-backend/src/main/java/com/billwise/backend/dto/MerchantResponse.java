package com.billwise.backend.dto;

import com.billwise.backend.entity.Merchant;
import com.billwise.backend.entity.MerchantStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MerchantResponse {

    private String id;
    private String legalName;
    private String tradeName;
    private String gstin;
    private String pan;
    private String businessType;
    private String registeredAddress;
    private String state;
    private String stateCode;
    private String pincode;
    private String contactEmail;
    private String contactPhone;
    private String gstCertificateUrl;
    private String shopLicenseUrl;
    private String storefrontPhotoUrl;
    private MerchantStatus status;
    private String rejectionReason;
    private List<String> duplicateWarningFlags;
    private String adminUsername;
    private Instant verifiedAt;
    private String verifiedBy;
    private Instant createdAt;
    private Instant updatedAt;

    public static MerchantResponse fromEntity(Merchant m) {
        if (m == null) return null;
        return new MerchantResponse(
                m.getId(),
                m.getLegalName(),
                m.getTradeName(),
                m.getGstin(),
                m.getPan(),
                m.getBusinessType(),
                m.getRegisteredAddress(),
                m.getState(),
                m.getStateCode(),
                m.getPincode(),
                m.getContactEmail(),
                m.getContactPhone(),
                m.getGstCertificateUrl(),
                m.getShopLicenseUrl(),
                m.getStorefrontPhotoUrl(),
                m.getStatus(),
                m.getRejectionReason(),
                m.getDuplicateWarningFlags(),
                m.getAdminUsername(),
                m.getVerifiedAt(),
                m.getVerifiedBy(),
                m.getCreatedAt(),
                m.getUpdatedAt()
        );
    }
}
