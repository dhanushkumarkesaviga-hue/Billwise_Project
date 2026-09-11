package com.billwise.invoice.config;

import com.billwise.invoice.entity.GstDeadline;
import com.billwise.invoice.entity.Invoice;
import com.billwise.invoice.entity.SalesInvoice;
import com.billwise.invoice.repository.GstDeadlineRepository;
import com.billwise.invoice.repository.InvoiceRepository;
import com.billwise.invoice.repository.SalesInvoiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.springframework.boot.CommandLineRunner;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class InvoiceDataSeeder implements CommandLineRunner {

    private final InvoiceRepository invoiceRepository;
    private final SalesInvoiceRepository salesInvoiceRepository;
    private final GstDeadlineRepository gstDeadlineRepository;
    private final MongoTemplate mongoTemplate;

    @Override
    public void run(String... args) {
        seedInvoices();
        seedSalesInvoices();
        seedDeadlines();
    }

    /**
     * Looks up a merchant's real MongoDB _id by querying the shared "merchants"
     * collection using their GSTIN. Both auth-service and invoice-service share
     * the same "billwise" database, so this cross-collection lookup works.
     */
    private String resolveMerchantIdByGstin(String gstin) {
        try {
            Document merchant = mongoTemplate.getDb()
                    .getCollection("merchants")
                    .find(new Document("gstin", gstin))
                    .first();
            if (merchant != null) {
                String id = merchant.get("_id").toString();
                log.info("Resolved merchantId for GSTIN {}: {}", gstin, id);
                return id;
            }
        } catch (Exception e) {
            log.warn("Could not resolve merchantId for GSTIN {}: {}", gstin, e.getMessage());
        }
        return null;
    }

    private void seedInvoices() {
        if (invoiceRepository.count() > 0) return;

        // Resolve the REAL merchant IDs from the shared MongoDB
        String shriRamMerchantId = resolveMerchantIdByGstin("27AAACA1234F1Z5");
        String apexMerchantId = resolveMerchantIdByGstin("27AAAAA0000A1Z5");

        if (shriRamMerchantId == null) {
            log.warn("Shri Ram Enterprise merchant not found in DB — skipping invoice seeding. "
                    + "Ensure auth-service starts first so merchants are seeded.");
            return;
        }

        // ── Shri Ram Enterprise invoices ──
        invoiceRepository.save(invoice("INV-2026-0891", shriRamMerchantId, "Apex Cloud Technologies Pvt Ltd", "27AAACA1234F1Z5",
                "ACT-89104", LocalDate.of(2026, 7, 28), LocalDate.of(2026, 8, 27),
                "Cloud Infrastructure", "998313", "45000", 18, "4050", "4050", "0", "53100",
                "Eligible", "8100", false, "Approved", "Paid", 98.4,
                "Monthly server hosting & load balancer setup"));

        invoiceRepository.save(invoice("INV-2026-0892", shriRamMerchantId, "National Logistics & Freight Solutions", "07BBBCC5678G2Z9",
                "NLFS/AUG/102", LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 15),
                "Freight & Transport", "996511", "28500", 5, "0", "0", "1425", "29925",
                "Eligible (RCM)", "1425", true, "Pending", "Unpaid", 96.1,
                "Goods transport agency charges for North Zone delivery"));

        invoiceRepository.save(invoice("INV-2026-0893", shriRamMerchantId, "ErgoFurniture Works India", "29DDDEE9012H3Z1",
                "EFW-2026-991", LocalDate.of(2026, 7, 15), LocalDate.of(2026, 8, 14),
                "Capital Goods & Office Assets", "940330", "120000", 28, "16800", "16800", "0", "153600",
                "Eligible", "33600", false, "Approved", "Paid", 99.1,
                "Ergonomic mesh chairs and standing desks for team expansion"));

        invoiceRepository.save(invoice("INV-2026-0894", shriRamMerchantId, "Grand Palace Hotel & Catering", "07AAACG9988K1Z3",
                "GPH-4412", LocalDate.of(2026, 7, 29), LocalDate.of(2026, 7, 29),
                "Food & Entertainment", "996331", "14200", 5, "355", "355", "0", "14910",
                "Ineligible (Sec 17(5))", "0", false, "Flagged", "Paid", 94.8,
                "Client dinner & catering event - Blocked ITC under GST Sec 17(5)(b)"));

        invoiceRepository.save(invoice("INV-2026-0895", shriRamMerchantId, "Mahavir Industrial Hardware & Tools", "27KKKLL4455M1Z8",
                "MIH/26-27/044", LocalDate.of(2026, 8, 2), LocalDate.of(2026, 8, 31),
                "Raw Materials", "731815", "84000", 18, "7560", "7560", "0", "99120",
                "Eligible", "15120", false, "Pending", "Unpaid", 97.2,
                "Stainless steel fasteners & industrial hardware batch #3"));

        log.info("Seeded 5 demo invoices for Shri Ram Enterprise (merchantId: {})", shriRamMerchantId);

        // ── Apex Logistics invoices (unique data for the second demo tenant) ──
        if (apexMerchantId != null) {
            invoiceRepository.save(invoice("INV-2026-1001", apexMerchantId, "IndoFleet Diesel & Fuel Corp", "27MMNNP6677R1Z4",
                    "IDF/AUG/310", LocalDate.of(2026, 8, 3), LocalDate.of(2026, 8, 18),
                    "Freight & Transport", "271019", "62000", 18, "5580", "5580", "0", "73160",
                    "Eligible", "11160", false, "Approved", "Unpaid", 97.5,
                    "Diesel fuel procurement for fleet operations Aug-2026"));

            invoiceRepository.save(invoice("INV-2026-1002", apexMerchantId, "QuickPack Warehousing Solutions", "27QQRRS2233T1Z6",
                    "QWS-26-0087", LocalDate.of(2026, 7, 25), LocalDate.of(2026, 8, 24),
                    "Rent & Facilities", "997212", "185000", 18, "16650", "16650", "0", "218300",
                    "Eligible", "33300", false, "Approved", "Paid", 99.3,
                    "Monthly warehouse rent — Bhiwandi facility (25,000 sq ft)"));

            invoiceRepository.save(invoice("INV-2026-1003", apexMerchantId, "RouteMaster GPS & Telematics", "29AABCR5544U1Z2",
                    "RM/INV-2026-445", LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31),
                    "Software & Subscriptions", "998314", "24500", 18, "2205", "2205", "0", "28910",
                    "Eligible", "4410", false, "Pending", "Unpaid", 96.8,
                    "Annual GPS fleet tracking subscription — 50 vehicle plan"));

            invoiceRepository.save(invoice("INV-2026-1004", apexMerchantId, "SafeHaul Tyre & Retreading Co.", "27PPQQR8899S1Z1",
                    "SH-TYR/0562", LocalDate.of(2026, 7, 20), LocalDate.of(2026, 8, 19),
                    "Repairs & Maintenance", "401120", "38000", 28, "5320", "5320", "0", "48640",
                    "Eligible", "10640", false, "Approved", "Paid", 98.1,
                    "Retread truck tyres (16 units) for long-haul fleet"));

            log.info("Seeded 4 demo invoices for Apex Logistics (merchantId: {})", apexMerchantId);
        } else {
            log.warn("Apex Logistics merchant not found — skipped seeding Apex invoices.");
        }
    }

    private void seedDeadlines() {
        if (gstDeadlineRepository.count() > 0) return;

        gstDeadlineRepository.save(deadline("gstr-1-aug", "GSTR-1", "Outward Supplies Return", "Monthly",
                LocalDate.of(2026, 8, 11), "Upcoming",
                "Details of all outward supplies (sales) made during July 2026 for regular taxpayers with turnover > Rs. 5 Cr.",
                50, 10000, "High - Delay blocks ITC pass-through to your buyers in GSTR-2B"));

        gstDeadlineRepository.save(deadline("gstr-3b-aug", "GSTR-3B", "Summary Tax Return & Payment", "Monthly",
                LocalDate.of(2026, 8, 20), "Upcoming",
                "Self-assessed monthly summary return for tax payment and ITC claim for July 2026.",
                50, 10000, "Critical - Requires cash payment or net ITC offset against output liability"));

        gstDeadlineRepository.save(deadline("iff-qrmp", "GSTR-1 (IFF)", "Invoice Furnishing Facility (QRMP)",
                "Monthly (Optional)", LocalDate.of(2026, 8, 13), "Optional",
                "Optional facility for quarterly filers to pass ITC to B2B customers for Month 1 & 2.",
                0, 0, "Medium - Facilitates faster ITC claim for buyers"));

        gstDeadlineRepository.save(deadline("cmp-08-q2", "CMP-08", "Composition Tax Payment Statement",
                "Quarterly", LocalDate.of(2026, 10, 18), "Upcoming",
                "Quarterly self-assessed tax payment statement for Composition Scheme taxpayers (Q2 FY 2026-27).",
                50, 2000, "Medium - Flat rate tax payment based on turnover"));

        gstDeadlineRepository.save(deadline("gstr-9-fy26", "GSTR-9 & 9C", "Annual GST Return & Reconciliation",
                "Annual", LocalDate.of(2026, 12, 31), "Scheduled",
                "Annual consolidated return and audit reconciliation statement for FY 2025-26.",
                200, 25000, "High - Final opportunity to rectify ITC mismatches"));

        log.info("Finished seeding statutory GST deadlines.");
    }

    private Invoice invoice(String id, String merchantId, String vendorName, String gstin, String invoiceNumber,
                             LocalDate invoiceDate, LocalDate dueDate, String category, String hsnSac,
                             String taxableAmount, double gstRate, String cgst, String sgst, String igst,
                             String totalAmount, String itcEligibility, String itcAmount, boolean rcmApplicable,
                             String status, String paymentStatus, double ocrConfidence, String notes) {
        Invoice inv = new Invoice();
        inv.setId(id);
        inv.setMerchantId(merchantId);
        inv.setVendorName(vendorName);
        inv.setGstin(gstin);
        inv.setInvoiceNumber(invoiceNumber);
        inv.setInvoiceDate(invoiceDate);
        inv.setDueDate(dueDate);
        inv.setCategory(category);
        inv.setHsnSac(hsnSac);
        inv.setTaxableAmount(new BigDecimal(taxableAmount));
        inv.setGstRate(gstRate);
        inv.setCgst(new BigDecimal(cgst));
        inv.setSgst(new BigDecimal(sgst));
        inv.setIgst(new BigDecimal(igst));
        inv.setTotalAmount(new BigDecimal(totalAmount));
        inv.setItcEligibility(itcEligibility);
        inv.setItcAmount(new BigDecimal(itcAmount));
        inv.setRcmApplicable(rcmApplicable);
        inv.setStatus(status);
        inv.setPaymentStatus(paymentStatus);
        inv.setOcrConfidence(ocrConfidence);
        inv.setNotes(notes);
        return inv;
    }

    private GstDeadline deadline(String id, String formName, String title, String frequency, LocalDate dueDate,
                                  String status, String description, int lateFeePerDay, int maxPenalty,
                                  String impact) {
        GstDeadline d = new GstDeadline();
        d.setId(id);
        d.setFormName(formName);
        d.setTitle(title);
        d.setFrequency(frequency);
        d.setDueDate(dueDate);
        d.setStatus(status);
        d.setDescription(description);
        d.setLateFeePerDay(lateFeePerDay);
        d.setMaxPenalty(maxPenalty);
        d.setImpact(impact);
        return d;
    }

    private void seedSalesInvoices() {
        if (salesInvoiceRepository.count() > 0) return;

        String shriRamMerchantId = resolveMerchantIdByGstin("27AAACA1234F1Z5");
        String apexMerchantId = resolveMerchantIdByGstin("27AAAAA0000A1Z5");
        String targetMerchantId = shriRamMerchantId != null ? shriRamMerchantId : apexMerchantId;

        List<SalesInvoice> demoSales = List.of(
                salesInv("SINV-2026-101", targetMerchantId, "Tata Consultancy Services Ltd", "27AAACT2727Q1ZW",
                        "INV/2026/089", LocalDate.of(2026, 2, 10), LocalDate.of(2026, 3, 10), "998313",
                        "150000.00", 18.0, "13500.00", "13500.00", "0.00", "177000.00",
                        "B2B", "Issued", "27", "Enterprise cloud consulting retainer", "admin"),

                salesInv("SINV-2026-102", targetMerchantId, "Infosys Technologies Bangalore", "29AAACI4747B1ZB",
                        "INV/2026/090", LocalDate.of(2026, 2, 15), LocalDate.of(2026, 3, 15), "998315",
                        "280000.00", 18.0, "0.00", "0.00", "50400.00", "330400.00",
                        "B2B", "Issued", "29", "Interstate software subscription license", "admin"),

                salesInv("SINV-2026-103", targetMerchantId, "Aarav Sharma (Delhi Client)", null,
                        "INV/2026/091", LocalDate.of(2026, 2, 20), LocalDate.of(2026, 3, 20), "8471",
                        "260000.00", 18.0, "0.00", "0.00", "46800.00", "306800.00",
                        "B2C", "Issued", "07", "Interstate high-value server asset delivery (B2C Large > ₹2.5L)", "admin"),

                salesInv("SINV-2026-104", targetMerchantId, "Pooja Deshmukh (Pune Retail)", null,
                        "INV/2026/092", LocalDate.of(2026, 2, 22), LocalDate.of(2026, 3, 22), "4820",
                        "14500.00", 12.0, "870.00", "870.00", "0.00", "16240.00",
                        "B2C", "Issued", "27", "Intrastate stationery supplies retail order", "admin"),

                salesInv("SINV-2026-105", targetMerchantId, "Kavita Reddy (Hyderabad Consumer)", null,
                        "INV/2026/093", LocalDate.of(2026, 2, 25), LocalDate.of(2026, 3, 25), "998315",
                        "35000.00", 18.0, "0.00", "0.00", "6300.00", "41300.00",
                        "B2C", "Issued", "36", "Interstate online software access (B2C Small <= ₹2.5L)", "admin"),

                salesInv("SINV-2026-106", targetMerchantId, "Acme Global Corp (USA)", null,
                        "INV/2026/094", LocalDate.of(2026, 2, 28), LocalDate.of(2026, 3, 28), "998313",
                        "400000.00", 0.0, "0.00", "0.00", "0.00", "400000.00",
                        "EXPORT", "Issued", "96", "Export of IT enabled services under LUT (Zero-rated)", "admin")
        );

        salesInvoiceRepository.saveAll(demoSales);
        log.info("Seeded {} demo sales invoices (B2B, B2C Large, B2C Small, Exports)", demoSales.size());
    }

    private SalesInvoice salesInv(String id, String merchantId, String customerName, String customerGstin,
                                  String invoiceNumber, LocalDate invoiceDate, LocalDate dueDate, String hsnSac,
                                  String taxableAmount, Double gstRate, String cgst, String sgst, String igst,
                                  String totalAmount, String supplyType, String status, String placeOfSupply,
                                  String notes, String createdBy) {
        SalesInvoice s = new SalesInvoice();
        s.setId(id);
        s.setMerchantId(merchantId);
        s.setCustomerName(customerName);
        s.setCustomerGstin(customerGstin);
        s.setInvoiceNumber(invoiceNumber);
        s.setInvoiceDate(invoiceDate);
        s.setDueDate(dueDate);
        s.setHsnSac(hsnSac);
        s.setTaxableAmount(new BigDecimal(taxableAmount));
        s.setGstRate(gstRate);
        s.setCgst(new BigDecimal(cgst));
        s.setSgst(new BigDecimal(sgst));
        s.setIgst(new BigDecimal(igst));
        s.setTotalAmount(new BigDecimal(totalAmount));
        s.setSupplyType(supplyType);
        s.setStatus(status);
        s.setPlaceOfSupply(placeOfSupply);
        s.setNotes(notes);
        s.setCreatedBy(createdBy);
        return s;
    }
}

