package com.billwise.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateBusinessRequest {

    private String tradeName;
    private String businessType;
    private String registeredAddress;
    private String state;
    private String pincode;
    private String contactEmail;
    private String contactPhone;
    private String taxpayerType;
    private String turnoverSlab;
    private String filingFrequency;
    private Boolean emailRemindersEnabled;
}
