package com.billwise.invoice.service;

import com.billwise.common.util.GstValidationUtil;
import com.billwise.invoice.dto.SalesInvoiceDtos.*;
import com.billwise.invoice.entity.Invoice;
import com.billwise.invoice.entity.SalesInvoice;
import com.billwise.invoice.repository.InvoiceRepository;
import com.billwise.invoice.repository.SalesInvoiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class GstrSummaryService {

    private final SalesInvoiceRepository salesInvoiceRepository;
    private final InvoiceRepository invoiceRepository;

    private static final BigDecimal B2C_LARGE_THRESHOLD = new BigDecimal("250000");

    /**
     * Calculates GSTR-3B Net Tax Liability for a merchant across a specified date range.
     * Formula: Net GST Payable = Total Output Tax (Sales) - Total Eligible ITC (Purchases).
     * Strictly isolates Section 17(5) blocked purchases, which must never reduce the payable amount.
     */
    public Gstr3bSummaryDto calculateNetLiability(String merchantId, LocalDate from, LocalDate to) {
        log.info("Calculating GSTR-3B Net Liability for merchant: {}, period: {} to {}", merchantId, from, to);

        List<SalesInvoice> allSales = (merchantId != null)
                ? salesInvoiceRepository.findByMerchantId(merchantId)
                : salesInvoiceRepository.findAll();

        List<SalesInvoice> salesInPeriod = allSales.stream()
                .filter(s -> !"Cancelled".equalsIgnoreCase(s.getStatus()))
                .filter(s -> isDateWithinRange(s.getInvoiceDate(), from, to))
                .toList();

        // 1. Sum Output Tax (Table 3.1)
        BigDecimal totalOutputTaxable = BigDecimal.ZERO;
        BigDecimal totalOutputCgst = BigDecimal.ZERO;
        BigDecimal totalOutputSgst = BigDecimal.ZERO;
        BigDecimal totalOutputIgst = BigDecimal.ZERO;

        for (SalesInvoice s : salesInPeriod) {
            totalOutputTaxable = totalOutputTaxable.add(nz(s.getTaxableAmount()));
            totalOutputCgst = totalOutputCgst.add(nz(s.getCgst()));
            totalOutputSgst = totalOutputSgst.add(nz(s.getSgst()));
            totalOutputIgst = totalOutputIgst.add(nz(s.getIgst()));
        }
        BigDecimal totalOutputTax = totalOutputCgst.add(totalOutputSgst).add(totalOutputIgst);

        // 2. Sum Eligible ITC vs Ineligible ITC from purchase invoices
        List<Invoice> allPurchases = (merchantId != null)
                ? invoiceRepository.findByMerchantId(merchantId)
                : invoiceRepository.findAll();

        List<Invoice> purchasesInPeriod = allPurchases.stream()
                .filter(p -> isDateWithinRange(p.getInvoiceDate(), from, to))
                .toList();

        BigDecimal totalEligibleTaxable = BigDecimal.ZERO;
        BigDecimal totalEligibleCgst = BigDecimal.ZERO;
        BigDecimal totalEligibleSgst = BigDecimal.ZERO;
        BigDecimal totalEligibleIgst = BigDecimal.ZERO;
        BigDecimal totalEligibleItc = BigDecimal.ZERO;
        long eligibleCount = 0;

        BigDecimal totalIneligibleItc = BigDecimal.ZERO;
        long ineligibleCount = 0;

        for (Invoice inv : purchasesInPeriod) {
            boolean isEligible = isItcEligible(inv);
            boolean isIneligible = isItcIneligible(inv);

            if (isEligible) {
                totalEligibleTaxable = totalEligibleTaxable.add(nz(inv.getTaxableAmount()));
                totalEligibleCgst = totalEligibleCgst.add(nz(inv.getCgst()));
                totalEligibleSgst = totalEligibleSgst.add(nz(inv.getSgst()));
                totalEligibleIgst = totalEligibleIgst.add(nz(inv.getIgst()));

                BigDecimal itcAmt = nz(inv.getItcAmount());
                if (itcAmt.compareTo(BigDecimal.ZERO) == 0) {
                    itcAmt = nz(inv.getCgst()).add(nz(inv.getSgst())).add(nz(inv.getIgst()));
                }
                totalEligibleItc = totalEligibleItc.add(itcAmt);
                eligibleCount++;
            } else if (isIneligible || !isEligible) {
                // Section 17(5) blocked ITC or Bill of Supply or other ineligible input tax
                BigDecimal blockedAmt = nz(inv.getCgst()).add(nz(inv.getSgst())).add(nz(inv.getIgst()));
                if (blockedAmt.compareTo(BigDecimal.ZERO) == 0) {
                    blockedAmt = nz(inv.getItcAmount());
                }
                totalIneligibleItc = totalIneligibleItc.add(blockedAmt);
                ineligibleCount++;
            }
        }

        // 3. Head-wise & Net Tax Settlement
        BigDecimal netCgst = totalOutputCgst.subtract(totalEligibleCgst);
        BigDecimal netSgst = totalOutputSgst.subtract(totalEligibleSgst);
        BigDecimal netIgst = totalOutputIgst.subtract(totalEligibleIgst);

        BigDecimal netBalance = totalOutputTax.subtract(totalEligibleItc);

        String liabilityType;
        BigDecimal netPayableAmount;
        BigDecimal carryForwardAmount;
        String statusMessage;

        if (netBalance.compareTo(BigDecimal.ZERO) > 0) {
            liabilityType = "PAYABLE";
            netPayableAmount = netBalance.setScale(2, RoundingMode.HALF_UP);
            carryForwardAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            statusMessage = "Net GST of ₹" + netPayableAmount.toPlainString() + " is payable to the Government for this tax period.";
        } else {
            liabilityType = "CARRY_FORWARD";
            netPayableAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            carryForwardAmount = netBalance.abs().setScale(2, RoundingMode.HALF_UP);
            statusMessage = "Excess ITC credit of ₹" + carryForwardAmount.toPlainString() + " available to carry forward to the next tax period.";
        }

        return Gstr3bSummaryDto.builder()
                .fromDate(from)
                .toDate(to)
                .totalOutputTaxableAmount(totalOutputTaxable.setScale(2, RoundingMode.HALF_UP))
                .totalOutputCgst(totalOutputCgst.setScale(2, RoundingMode.HALF_UP))
                .totalOutputSgst(totalOutputSgst.setScale(2, RoundingMode.HALF_UP))
                .totalOutputIgst(totalOutputIgst.setScale(2, RoundingMode.HALF_UP))
                .totalOutputTax(totalOutputTax.setScale(2, RoundingMode.HALF_UP))
                .salesInvoiceCount(salesInPeriod.size())
                .totalEligibleItcTaxableAmount(totalEligibleTaxable.setScale(2, RoundingMode.HALF_UP))
                .totalEligibleCgst(totalEligibleCgst.setScale(2, RoundingMode.HALF_UP))
                .totalEligibleSgst(totalEligibleSgst.setScale(2, RoundingMode.HALF_UP))
                .totalEligibleIgst(totalEligibleIgst.setScale(2, RoundingMode.HALF_UP))
                .totalEligibleItc(totalEligibleItc.setScale(2, RoundingMode.HALF_UP))
                .eligiblePurchaseInvoiceCount(eligibleCount)
                .totalIneligibleItc(totalIneligibleItc.setScale(2, RoundingMode.HALF_UP))
                .ineligiblePurchaseInvoiceCount(ineligibleCount)
                .netCgst(netCgst.setScale(2, RoundingMode.HALF_UP))
                .netSgst(netSgst.setScale(2, RoundingMode.HALF_UP))
                .netIgst(netIgst.setScale(2, RoundingMode.HALF_UP))
                .netTaxLiability(netBalance.setScale(2, RoundingMode.HALF_UP))
                .liabilityType(liabilityType)
                .netPayableAmount(netPayableAmount)
                .carryForwardCreditAmount(carryForwardAmount)
                .statusMessage(statusMessage)
                .build();
    }

    /**
     * Generates statutory GSTR-1 Outward Supplies Report partitioned into:
     * - Table 4: B2B Invoices (registered recipients)
     * - Table 5: B2C Large (interstate unregistered > ₹2.5L)
     * - Table 7: B2C Small (state-wise & rate-wise summary)
     * - Table 6: Exports & SEZ supplies (zero-rated)
     * - Table 12: HSN-wise Outward Summary
     */
    public Gstr1ReportDto generateGstr1Report(String merchantId, LocalDate from, LocalDate to) {
        log.info("Generating GSTR-1 Outward Supply Report for merchant: {}, period: {} to {}", merchantId, from, to);

        List<SalesInvoice> allSales = (merchantId != null)
                ? salesInvoiceRepository.findByMerchantId(merchantId)
                : salesInvoiceRepository.findAll();

        List<SalesInvoice> validSales = allSales.stream()
                .filter(s -> !"Cancelled".equalsIgnoreCase(s.getStatus()))
                .filter(s -> isDateWithinRange(s.getInvoiceDate(), from, to))
                .toList();

        List<B2bSupplyItem> b2bList = new ArrayList<>();
        List<B2cLargeSupplyItem> b2cLargeList = new ArrayList<>();
        List<ExportSupplyItem> exportList = new ArrayList<>();
        Map<String, B2cSmallSummaryAccumulator> b2cSmallMap = new LinkedHashMap<>();
        Map<String, HsnSummaryAccumulator> hsnMap = new LinkedHashMap<>();

        BigDecimal grandTaxable = BigDecimal.ZERO;
        BigDecimal grandCgst = BigDecimal.ZERO;
        BigDecimal grandSgst = BigDecimal.ZERO;
        BigDecimal grandIgst = BigDecimal.ZERO;
        BigDecimal grandTotal = BigDecimal.ZERO;

        for (SalesInvoice inv : validSales) {
            BigDecimal taxable = nz(inv.getTaxableAmount());
            BigDecimal cgst = nz(inv.getCgst());
            BigDecimal sgst = nz(inv.getSgst());
            BigDecimal igst = nz(inv.getIgst());
            BigDecimal total = nz(inv.getTotalAmount());
            Double rate = inv.getGstRate() != null ? inv.getGstRate() : 0.0;
            String supplyType = inv.getSupplyType() != null ? inv.getSupplyType().toUpperCase() : "B2B";
            String custGstin = inv.getCustomerGstin() != null ? inv.getCustomerGstin().trim().toUpperCase() : "";
            String placeOfSupply = inv.getPlaceOfSupply() != null ? inv.getPlaceOfSupply().trim() : "";

            grandTaxable = grandTaxable.add(taxable);
            grandCgst = grandCgst.add(cgst);
            grandSgst = grandSgst.add(sgst);
            grandIgst = grandIgst.add(igst);
            grandTotal = grandTotal.add(total);

            // 1. Export / SEZ supplies
            if ("EXPORT".equalsIgnoreCase(supplyType) || "SEZ".equalsIgnoreCase(supplyType)) {
                exportList.add(B2cSupplyBuilder.toExportItem(inv));
            }
            // 2. B2B Invoices (has GSTIN or explicitly marked B2B)
            else if ("B2B".equalsIgnoreCase(supplyType) || !custGstin.isBlank()) {
                b2bList.add(B2cSupplyBuilder.toB2bItem(inv));
            }
            // 3. B2C Supplies (unregistered recipient)
            else {
                boolean isInterstate = igst.compareTo(BigDecimal.ZERO) > 0;
                boolean isLarge = isInterstate && total.compareTo(B2C_LARGE_THRESHOLD) > 0;

                if (isLarge) {
                    // Table 5: B2C Large
                    b2cLargeList.add(B2cSupplyBuilder.toB2cLargeItem(inv));
                } else {
                    // Table 7: B2C Small (state-wise & rate-wise aggregated)
                    String stateKey = placeOfSupply.isEmpty() ? "Default" : placeOfSupply;
                    String aggKey = stateKey + "_" + rate;

                    B2cSmallSummaryAccumulator acc = b2cSmallMap.computeIfAbsent(aggKey, k -> new B2cSmallSummaryAccumulator(stateKey, rate));
                    acc.add(taxable, cgst, sgst, igst);
                }
            }

            // 4. HSN-wise aggregation (Table 12)
            String hsn = (inv.getHsnSac() != null && !inv.getHsnSac().isBlank()) ? inv.getHsnSac().trim() : "998313";
            String hsnKey = hsn + "_" + rate;
            HsnSummaryAccumulator hsnAcc = hsnMap.computeIfAbsent(hsnKey, k -> new HsnSummaryAccumulator(hsn, rate));
            hsnAcc.add(taxable, cgst, sgst, igst, total);
        }

        List<B2cSmallSummaryItem> b2cSmallList = b2cSmallMap.values().stream()
                .map(B2cSmallSummaryAccumulator::toDto)
                .collect(Collectors.toList());

        List<HsnSummaryItem> hsnList = hsnMap.values().stream()
                .map(HsnSummaryAccumulator::toDto)
                .collect(Collectors.toList());

        BigDecimal grandOutputTax = grandCgst.add(grandSgst).add(grandIgst);

        return Gstr1ReportDto.builder()
                .fromDate(from)
                .toDate(to)
                .b2bInvoices(b2bList)
                .b2cLargeInvoices(b2cLargeList)
                .b2cSmallSummaries(b2cSmallList)
                .exportInvoices(exportList)
                .hsnSummaries(hsnList)
                .totalTaxableValue(grandTaxable.setScale(2, RoundingMode.HALF_UP))
                .totalCgst(grandCgst.setScale(2, RoundingMode.HALF_UP))
                .totalSgst(grandSgst.setScale(2, RoundingMode.HALF_UP))
                .totalIgst(grandIgst.setScale(2, RoundingMode.HALF_UP))
                .totalOutputTax(grandOutputTax.setScale(2, RoundingMode.HALF_UP))
                .totalInvoiceValue(grandTotal.setScale(2, RoundingMode.HALF_UP))
                .totalInvoicesCount(validSales.size())
                .build();
    }

    private boolean isDateWithinRange(LocalDate date, LocalDate from, LocalDate to) {
        if (date == null) return false;
        if (from != null && date.isBefore(from)) return false;
        if (to != null && date.isAfter(to)) return false;
        return true;
    }

    private BigDecimal nz(BigDecimal val) {
        return val != null ? val : BigDecimal.ZERO;
    }

    /**
     * Checks if a purchase invoice has eligible Input Tax Credit (ITC).
     * Strictly excludes any invoice with itcEligibility other than "Eligible" (or "Eligible (RCM)"),
     * and guarantees that any invoice marked "Ineligible (Sec 17(5))" or "Ineligible (Bill of Supply)"
     * is completely excluded from the GSTR-3B net liability calculation.
     */
    public static boolean isItcEligible(Invoice inv) {
        if (inv == null || inv.getItcEligibility() == null) {
            return false;
        }
        String itc = inv.getItcEligibility().trim();
        if (itc.toLowerCase().contains("ineligible") || itc.toLowerCase().contains("blocked") || itc.toLowerCase().contains("17(5)")) {
            return false;
        }
        return "Eligible".equalsIgnoreCase(itc) || itc.equalsIgnoreCase("Eligible (RCM)") || itc.toLowerCase().startsWith("eligible");
    }

    /**
     * Checks if an invoice has blocked or ineligible ITC under Section 17(5) or Bill of Supply.
     */
    public static boolean isItcIneligible(Invoice inv) {
        if (inv == null || inv.getItcEligibility() == null) {
            return false;
        }
        String itc = inv.getItcEligibility().trim().toLowerCase();
        return itc.contains("ineligible") || itc.contains("blocked") || itc.contains("17(5)");
    }

    // Accumulators & Helper classes
    private static class B2cSmallSummaryAccumulator {
        private final String placeOfSupply;
        private final Double gstRate;
        private BigDecimal taxable = BigDecimal.ZERO;
        private BigDecimal cgst = BigDecimal.ZERO;
        private BigDecimal sgst = BigDecimal.ZERO;
        private BigDecimal igst = BigDecimal.ZERO;
        private long count = 0;

        public B2cSmallSummaryAccumulator(String placeOfSupply, Double gstRate) {
            this.placeOfSupply = placeOfSupply;
            this.gstRate = gstRate;
        }

        public void add(BigDecimal t, BigDecimal c, BigDecimal s, BigDecimal i) {
            taxable = taxable.add(t);
            cgst = cgst.add(c);
            sgst = sgst.add(s);
            igst = igst.add(i);
            count++;
        }

        public B2cSmallSummaryItem toDto() {
            String stateName = GstValidationUtil.getStateFromStateCode(placeOfSupply);
            BigDecimal totalTax = cgst.add(sgst).add(igst);
            return B2cSmallSummaryItem.builder()
                    .placeOfSupply(placeOfSupply)
                    .stateName(stateName)
                    .gstRate(gstRate)
                    .totalTaxableAmount(taxable.setScale(2, RoundingMode.HALF_UP))
                    .totalCgst(cgst.setScale(2, RoundingMode.HALF_UP))
                    .totalSgst(sgst.setScale(2, RoundingMode.HALF_UP))
                    .totalIgst(igst.setScale(2, RoundingMode.HALF_UP))
                    .totalTax(totalTax.setScale(2, RoundingMode.HALF_UP))
                    .invoiceCount(count)
                    .build();
        }
    }

    private static class HsnSummaryAccumulator {
        private final String hsnSac;
        private final Double gstRate;
        private BigDecimal taxable = BigDecimal.ZERO;
        private BigDecimal cgst = BigDecimal.ZERO;
        private BigDecimal sgst = BigDecimal.ZERO;
        private BigDecimal igst = BigDecimal.ZERO;
        private BigDecimal total = BigDecimal.ZERO;
        private long count = 0;

        public HsnSummaryAccumulator(String hsnSac, Double gstRate) {
            this.hsnSac = hsnSac;
            this.gstRate = gstRate;
        }

        public void add(BigDecimal t, BigDecimal c, BigDecimal s, BigDecimal i, BigDecimal tot) {
            taxable = taxable.add(t);
            cgst = cgst.add(c);
            sgst = sgst.add(s);
            igst = igst.add(i);
            total = total.add(tot);
            count++;
        }

        public HsnSummaryItem toDto() {
            BigDecimal totalTax = cgst.add(sgst).add(igst);
            return HsnSummaryItem.builder()
                    .hsnSac(hsnSac)
                    .gstRate(gstRate)
                    .totalTaxableAmount(taxable.setScale(2, RoundingMode.HALF_UP))
                    .totalCgst(cgst.setScale(2, RoundingMode.HALF_UP))
                    .totalSgst(sgst.setScale(2, RoundingMode.HALF_UP))
                    .totalIgst(igst.setScale(2, RoundingMode.HALF_UP))
                    .totalTax(totalTax.setScale(2, RoundingMode.HALF_UP))
                    .totalInvoiceAmount(total.setScale(2, RoundingMode.HALF_UP))
                    .lineCount(count)
                    .build();
        }
    }

    private static class B2cSupplyBuilder {
        public static B2bSupplyItem toB2bItem(SalesInvoice s) {
            return B2bSupplyItem.builder()
                    .id(s.getId())
                    .customerGstin(s.getCustomerGstin())
                    .customerName(s.getCustomerName())
                    .invoiceNumber(s.getInvoiceNumber())
                    .invoiceDate(s.getInvoiceDate())
                    .taxableAmount(s.getTaxableAmount())
                    .gstRate(s.getGstRate())
                    .cgst(s.getCgst())
                    .sgst(s.getSgst())
                    .igst(s.getIgst())
                    .totalAmount(s.getTotalAmount())
                    .placeOfSupply(s.getPlaceOfSupply())
                    .build();
        }

        public static B2cLargeSupplyItem toB2cLargeItem(SalesInvoice s) {
            return B2cLargeSupplyItem.builder()
                    .id(s.getId())
                    .customerName(s.getCustomerName())
                    .invoiceNumber(s.getInvoiceNumber())
                    .invoiceDate(s.getInvoiceDate())
                    .taxableAmount(s.getTaxableAmount())
                    .gstRate(s.getGstRate())
                    .igst(s.getIgst())
                    .totalAmount(s.getTotalAmount())
                    .placeOfSupply(s.getPlaceOfSupply())
                    .build();
        }

        public static ExportSupplyItem toExportItem(SalesInvoice s) {
            return ExportSupplyItem.builder()
                    .id(s.getId())
                    .customerName(s.getCustomerName())
                    .invoiceNumber(s.getInvoiceNumber())
                    .invoiceDate(s.getInvoiceDate())
                    .taxableAmount(s.getTaxableAmount())
                    .gstRate(s.getGstRate())
                    .totalAmount(s.getTotalAmount())
                    .supplyType(s.getSupplyType())
                    .build();
        }
    }
}
