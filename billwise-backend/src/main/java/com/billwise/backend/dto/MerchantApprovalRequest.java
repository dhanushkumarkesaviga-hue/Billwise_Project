package com.billwise.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MerchantApprovalRequest {

    private String reason; // Optional approval notes or mandatory rejection reason
}
