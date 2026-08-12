package com.billwise.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MerchantResubmitRequest {

    private String legalName;
    private String tradeName;
    private String businessType;
    private String registeredAddress;
    private String state;
    private String pincode;
    private String contactEmail;
    private String contactPhone;

    private String gstCertificateUrl;
    private String shopLicenseUrl;
    private String storefrontPhotoUrl;
    private String resubmitNotes;
}
