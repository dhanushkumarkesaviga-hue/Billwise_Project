package com.billwise.gst.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Multi-tenant JPA Entity representing a line item on a GST Invoice.
 */
@Entity
@Table(name = "invoice_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceItem extends BaseTenantEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    @Column(name = "hsn_code", length = 20)
    private String hsnCode;

    @Column(name = "quantity", precision = 15, scale = 2, nullable = false)
    private BigDecimal quantity;

    @Column(name = "unit_price", precision = 15, scale = 2, nullable = false)
    private BigDecimal unitPrice;

    @Column(name = "taxable_amount", precision = 15, scale = 2, nullable = false)
    private BigDecimal taxableAmount;

    @Column(name = "gst_rate", precision = 6, scale = 2, nullable = false)
    private BigDecimal gstRate;

    @Column(name = "cgst_amount", precision = 15, scale = 2, nullable = false)
    private BigDecimal cgstAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

    @Column(name = "sgst_amount", precision = 15, scale = 2, nullable = false)
    private BigDecimal sgstAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

    @Column(name = "igst_amount", precision = 15, scale = 2, nullable = false)
    private BigDecimal igstAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

    @Column(name = "item_total", precision = 15, scale = 2, nullable = false)
    private BigDecimal itemTotal = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
}
