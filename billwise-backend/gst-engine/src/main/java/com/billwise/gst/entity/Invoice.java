package com.billwise.gst.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Multi-tenant JPA Entity representing a GST compliant Invoice.
 */
@Entity
@Table(name = "invoices")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Invoice extends BaseTenantEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "invoice_number", nullable = false)
    private String invoiceNumber;

    @Column(name = "invoice_date", nullable = false)
    private LocalDate invoiceDate;

    @Column(name = "supplier_state_code", length = 2, nullable = false)
    private String supplierStateCode;

    @Column(name = "recipient_state_code", length = 2, nullable = false)
    private String recipientStateCode;

    @Column(name = "is_inter_state", nullable = false)
    private boolean isInterState;

    @Column(name = "total_taxable_amount", precision = 15, scale = 2, nullable = false)
    private BigDecimal totalTaxableAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

    @Column(name = "total_cgst", precision = 15, scale = 2, nullable = false)
    private BigDecimal totalCgst = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

    @Column(name = "total_sgst", precision = 15, scale = 2, nullable = false)
    private BigDecimal totalSgst = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

    @Column(name = "total_igst", precision = 15, scale = 2, nullable = false)
    private BigDecimal totalIgst = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

    @Column(name = "grand_total", precision = 15, scale = 2, nullable = false)
    private BigDecimal grandTotal = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<InvoiceItem> items = new ArrayList<>();

    public void addItem(InvoiceItem item) {
        if (item != null) {
            items.add(item);
            item.setInvoice(this);
            if (this.getTenantId() != null && item.getTenantId() == null) {
                item.setTenantId(this.getTenantId());
            }
        }
    }

    public void removeItem(InvoiceItem item) {
        if (item != null) {
            items.remove(item);
            item.setInvoice(null);
        }
    }
}
