package com.billwise.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LineItemDto {
    private String description;
    private String hsnSac;
    private Double quantity;
    private Double unitPrice;
    private Double taxableValue;
    private Double gstRate;
    private Double cgst;
    private Double sgst;
    private Double igst;
    private Double totalAmount;
}
