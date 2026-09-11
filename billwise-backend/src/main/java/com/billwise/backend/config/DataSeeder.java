package com.billwise.backend.config;

import com.billwise.backend.entity.*;
import com.billwise.backend.repository.GstDeadlineRepository;
import com.billwise.backend.repository.InvoiceRepository;
import com.billwise.backend.repository.MerchantRepository;
import com.billwise.backend.repository.UserRepository;
import com.billwise.backend.repository.VerificationLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final InvoiceRepository invoiceRepository;
    private final com.billwise.backend.repository.SalesInvoiceRepository salesInvoiceRepository;
    private final GstDeadlineRepository gstDeadlineRepository;
    private final UserRepository userRepository;
    private final MerchantRepository merchantRepository;
    private final VerificationLogRepository verificationLogRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        Merchant shriRam = seedMerchantsAndUsers();
        seedInvoices(shriRam != null ? shriRam.getId() : null);
        seedSalesInvoices(shriRam != null ? shriRam.getId() : null);
        seedDeadlines();
    }

    private Merchant seedMerchantsAndUsers() {
        // 1. Seed SUPER_ADMIN if missing
        if (!userRepository.existsByUsername("superadmin")) {
            User superAdmin = new User();
            superAdmin.setUsername("superadmin");
            superAdmin.setEmail("superadmin@billwise.app");
            superAdmin.setFullName("Platform Administrator");
            superAdmin.setPhone("+91 9876543210");
            superAdmin.setPassword(passwordEncoder.encode("SuperAdmin@123"));
            superAdmin.setRole(Role.SUPER_ADMIN);
            superAdmin.setEnabled(true);
            superAdmin.setProfilePhotoUrl("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80");
            userRepository.save(superAdmin);
            log.info("Seeded demo SUPER_ADMIN user - superadmin / SuperAdmin@123");
        }

        // 2. Seed verified default merchant (Shri Ram Enterprise)
        Merchant verifiedMerchant;
        if (!merchantRepository.existsByGstin("27AAACA1234F1Z5")) {
            Merchant m = new Merchant();
            m.setLegalName("Shri Ram Enterprise Pvt Ltd");
            m.setTradeName("Shri Ram Enterprise");
            m.setGstin("27AAACA1234F1Z5");
            m.setPan("AAACA1234F");
            m.setBusinessType("Private Limited");
            m.setRegisteredAddress("Plot 42, MIDC Industrial Area, Andheri East");
            m.setState("Maharashtra");
            m.setStateCode("27");
            m.setPincode("400093");
            m.setContactEmail("contact@shriram.com");
            m.setContactPhone("+91 9820011223");
            m.setGstCertificateUrl("https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=60");
            m.setShopLicenseUrl("https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=60");
            m.setStatus(MerchantStatus.VERIFIED);
            m.setAdminUsername("admin");
            m.setVerifiedBy("superadmin");
            m.setVerifiedAt(Instant.now().minusSeconds(86400 * 30));
            m.setCreatedAt(Instant.now().minusSeconds(86400 * 35));
            m.setUpdatedAt(Instant.now());
            verifiedMerchant = merchantRepository.save(m);

            VerificationLog logEntry = new VerificationLog();
            logEntry.setMerchantId(verifiedMerchant.getId());
            logEntry.setAction("APPROVED");
            logEntry.setPerformedBy("superadmin");
            logEntry.setReason("Standard onboarding verification completed.");
            logEntry.setTimestamp(Instant.now().minusSeconds(86400 * 30));
            verificationLogRepository.save(logEntry);
        } else {
            verifiedMerchant = merchantRepository.findByGstin("27AAACA1234F1Z5").orElse(null);
        }

        String merchantId = verifiedMerchant != null ? verifiedMerchant.getId() : null;

        // Seed or update tenant demo accounts
        if (!userRepository.existsByUsername("admin")) {
            User admin = new User();
            admin.setUsername("admin");
            admin.setEmail("admin@billwise.app");
            admin.setFullName("Ram Sharma (Proprietor)");
            admin.setPhone("+91 9820011223");
            admin.setPassword(passwordEncoder.encode("Admin@123"));
            admin.setRole(Role.ADMIN);
            admin.setMerchantId(merchantId);
            admin.setEnabled(true);
            admin.setProfilePhotoUrl("https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80");
            userRepository.save(admin);
        } else if (merchantId != null) {
            userRepository.findByUsername("admin").ifPresent(u -> {
                if (u.getMerchantId() == null) {
                    u.setMerchantId(merchantId);
                    u.setFullName("Ram Sharma (Proprietor)");
                    userRepository.save(u);
                }
            });
        }

        if (!userRepository.existsByUsername("accountant")) {
            User accountant = new User();
            accountant.setUsername("accountant");
            accountant.setEmail("accountant@billwise.app");
            accountant.setFullName("Priya Patel (Sr. Accountant)");
            accountant.setPhone("+91 9820044556");
            accountant.setPassword(passwordEncoder.encode("Accountant@123"));
            accountant.setRole(Role.ACCOUNTANT);
            accountant.setMerchantId(merchantId);
            accountant.setEnabled(true);
            accountant.setProfilePhotoUrl("https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80");
            userRepository.save(accountant);
        } else if (merchantId != null) {
            userRepository.findByUsername("accountant").ifPresent(u -> {
                if (u.getMerchantId() == null) {
                    u.setMerchantId(merchantId);
                    u.setFullName("Priya Patel (Sr. Accountant)");
                    userRepository.save(u);
                }
            });
        }

        if (!userRepository.existsByUsername("viewer")) {
            User viewer = new User();
            viewer.setUsername("viewer");
            viewer.setEmail("viewer@billwise.app");
            viewer.setFullName("Anand Verma (Auditor)");
            viewer.setPhone("+91 9820077889");
            viewer.setPassword(passwordEncoder.encode("Viewer@123"));
            viewer.setRole(Role.VIEWER);
            viewer.setMerchantId(merchantId);
            viewer.setEnabled(true);
            viewer.setProfilePhotoUrl("https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80");
            userRepository.save(viewer);
        } else if (merchantId != null) {
            userRepository.findByUsername("viewer").ifPresent(u -> {
                if (u.getMerchantId() == null) {
                    u.setMerchantId(merchantId);
                    u.setFullName("Anand Verma (Auditor)");
                    userRepository.save(u);
                }
            });
        }

        // 3. Seed Demo Pending Merchants for Super Admin Queue Demo
        if (!merchantRepository.existsByGstin("27AAAAA0000A1Z5")) {
            Merchant m1 = new Merchant();
            m1.setLegalName("Apex Logistics & Supply Chain LLP");
            m1.setTradeName("Apex Logistics");
            m1.setGstin("27AAAAA0000A1Z5");
            m1.setPan("AAAAA0000A");
            m1.setBusinessType("LLP");
            m1.setRegisteredAddress("Sector 18, Vashi Navi Mumbai");
            m1.setState("Maharashtra");
            m1.setStateCode("27");
            m1.setPincode("400703");
            m1.setContactEmail("ops@apexlogistics.in");
            m1.setContactPhone("+91 9930123456");
            m1.setGstCertificateUrl("https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=60");
            m1.setShopLicenseUrl("https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=60");
            m1.setStorefrontPhotoUrl("https://images.unsplash.com/photo-1541888946425-d0fbb180c5f5?w=800&auto=format&fit=crop&q=60");
            m1.setStatus(MerchantStatus.PENDING_VERIFICATION);
            m1.setAdminUsername("apex_admin");
            m1.setDuplicateWarningFlags(List.of());
            m1.setCreatedAt(Instant.now().minusSeconds(86400 * 2));
            m1.setUpdatedAt(Instant.now().minusSeconds(86400 * 2));
            Merchant savedM1 = merchantRepository.save(m1);

            if (!userRepository.existsByUsername("apex_admin")) {
                User u = new User();
                u.setUsername("apex_admin");
                u.setEmail("ops@apexlogistics.in");
                u.setFullName("Vikram Malhotra");
                u.setPhone("+91 9930123456");
                u.setPassword(passwordEncoder.encode("Apex@123"));
                u.setRole(Role.ADMIN);
                u.setMerchantId(savedM1.getId());
                u.setEnabled(true);
                userRepository.save(u);
            }
        }

        if (!merchantRepository.existsByGstin("07BBBBB1111B2Z8")) {
            Merchant m2 = new Merchant();
            m2.setLegalName("Zenith Cloud Technologies Private Limited");
            m2.setTradeName("Zenith Cloud");
            m2.setGstin("07BBBBB1111B2Z8");
            m2.setPan("BBBBB1111B");
            m2.setBusinessType("Private Limited");
            m2.setRegisteredAddress("Barakhamba Road, Connaught Place");
            m2.setState("Delhi");
            m2.setStateCode("07");
            m2.setPincode("110001");
            m2.setContactEmail("finance@zenithcloud.io");
            m2.setContactPhone("+91 9811099887");
            m2.setGstCertificateUrl("https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=60");
            m2.setStorefrontPhotoUrl("https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=60");
            m2.setStatus(MerchantStatus.PENDING_VERIFICATION);
            m2.setAdminUsername("zenith_admin");
            m2.setDuplicateWarningFlags(List.of("Flag: Similar registered address region detected for trade name"));
            m2.setCreatedAt(Instant.now().minusSeconds(86400 * 1));
            m2.setUpdatedAt(Instant.now().minusSeconds(86400 * 1));
            Merchant savedM2 = merchantRepository.save(m2);

            if (!userRepository.existsByUsername("zenith_admin")) {
                User u = new User();
                u.setUsername("zenith_admin");
                u.setEmail("finance@zenithcloud.io");
                u.setFullName("Kavita Rao");
                u.setPhone("+91 9811099887");
                u.setPassword(passwordEncoder.encode("Zenith@123"));
                u.setRole(Role.ADMIN);
                u.setMerchantId(savedM2.getId());
                u.setEnabled(true);
                userRepository.save(u);
            }
        }

        // 4. Seed Demo Rejected Merchant (QuickMart Retail)
        if (!merchantRepository.existsByGstin("29CCCCC2222C3Z1")) {
            Merchant m3 = new Merchant();
            m3.setLegalName("QuickMart Retail Superstores India");
            m3.setTradeName("QuickMart Retail");
            m3.setGstin("29CCCCC2222C3Z1");
            m3.setPan("CCCCC2222C");
            m3.setBusinessType("Proprietorship");
            m3.setRegisteredAddress("8th Main, Koramangala 4th Block");
            m3.setState("Karnataka");
            m3.setStateCode("29");
            m3.setPincode("560034");
            m3.setContactEmail("store@quickmart.in");
            m3.setContactPhone("+91 9740011223");
            m3.setGstCertificateUrl("https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=60");
            m3.setStatus(MerchantStatus.REJECTED);
            m3.setRejectionReason("Uploaded GST certificate is blurry and Trade License expired on 31-Dec-2025. Please upload a clear PDF/image of Form GST REG-06 and renewed license.");
            m3.setAdminUsername("quickmart_admin");
            m3.setVerifiedBy("superadmin");
            m3.setVerifiedAt(Instant.now().minusSeconds(86400 * 3));
            m3.setCreatedAt(Instant.now().minusSeconds(86400 * 5));
            m3.setUpdatedAt(Instant.now().minusSeconds(86400 * 3));
            Merchant savedM3 = merchantRepository.save(m3);

            if (!userRepository.existsByUsername("quickmart_admin")) {
                User u = new User();
                u.setUsername("quickmart_admin");
                u.setEmail("store@quickmart.in");
                u.setFullName("Suresh Hegde");
                u.setPhone("+91 9740011223");
                u.setPassword(passwordEncoder.encode("QuickMart@123"));
                u.setRole(Role.ADMIN);
                u.setMerchantId(savedM3.getId());
                u.setEnabled(true);
                userRepository.save(u);
            }

            VerificationLog logEntry = new VerificationLog();
            logEntry.setMerchantId(savedM3.getId());
            logEntry.setAction("REJECTED");
            logEntry.setPerformedBy("superadmin");
            logEntry.setReason("Uploaded GST certificate is blurry and Trade License expired. Please resubmit.");
            logEntry.setTimestamp(Instant.now().minusSeconds(86400 * 3));
            verificationLogRepository.save(logEntry);
        }

        log.info("Finished seeding merchants, superadmin, and tenant test accounts.");
        return verifiedMerchant;
    }

    private void seedInvoices(String merchantId) {
        // Tag all existing invoices with merchantId if missing
        if (merchantId != null) {
            List<Invoice> existing = invoiceRepository.findAll();
            for (Invoice inv : existing) {
                if (inv.getMerchantId() == null) {
                    inv.setMerchantId(merchantId);
                    invoiceRepository.save(inv);
                }
            }
        }

        if (invoiceRepository.count() > 0) return;

        if (merchantId == null) return;

        invoiceRepository.save(invoice("INV-2026-0891", merchantId, "Apex Cloud Technologies Pvt Ltd", "27AAACA1234F1Z5",
                "ACT-89104", LocalDate.of(2026, 7, 28), LocalDate.of(2026, 8, 27),
                "Cloud Infrastructure", "998313", "45000", 18, "4050", "4050", "0", "53100",
                "Eligible", "8100", false, "Approved", "Paid", 98.4,
                "Monthly server hosting & load balancer setup"));

        invoiceRepository.save(invoice("INV-2026-0892", merchantId, "National Logistics & Freight Solutions", "07BBBCC5678G2Z9",
                "NLFS/AUG/102", LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 15),
                "Freight & Transport", "996511", "28500", 5, "0", "0", "1425", "29925",
                "Eligible (RCM)", "1425", true, "Pending", "Unpaid", 96.1,
                "Goods transport agency charges for North Zone delivery"));

        invoiceRepository.save(invoice("INV-2026-0893", merchantId, "ErgoFurniture Works India", "29DDDEE9012H3Z1",
                "EFW-2026-991", LocalDate.of(2026, 7, 15), LocalDate.of(2026, 8, 14),
                "Capital Goods & Office Assets", "940330", "120000", 28, "16800", "16800", "0", "153600",
                "Eligible", "33600", false, "Approved", "Paid", 99.1,
                "Ergonomic mesh chairs and standing desks for team expansion"));

        invoiceRepository.save(invoice("INV-2026-0894", merchantId, "Grand Palace Hotel & Catering", "07AAACG9988K1Z3",
                "GPH-4412", LocalDate.of(2026, 7, 29), LocalDate.of(2026, 7, 29),
                "Food & Entertainment", "996331", "14200", 5, "355", "355", "0", "14910",
                "Ineligible (Sec 17(5))", "0", false, "Flagged", "Paid", 94.8,
                "Client dinner & catering event - Blocked ITC under GST Sec 17(5)(b)"));

        invoiceRepository.save(invoice("INV-2026-0895", merchantId, "Mahavir Industrial Hardware & Tools", "27KKKLL4455M1Z8",
                "MIH/26-27/044", LocalDate.of(2026, 8, 2), LocalDate.of(2026, 8, 31),
                "Raw Materials", "731815", "84000", 18, "7560", "7560", "0", "99120",
                "Eligible", "15120", false, "Pending", "Unpaid", 97.2,
                "Stainless steel fasteners & industrial hardware batch #3"));
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

    private void seedSalesInvoices(String merchantId) {
        if (salesInvoiceRepository.count() > 0) return;

        List<com.billwise.backend.entity.SalesInvoice> demoSales = List.of(
                salesInv("SINV-2026-101", merchantId, "Tata Consultancy Services Ltd", "27AAACT2727Q1ZW",
                        "INV/2026/089", LocalDate.of(2026, 2, 10), LocalDate.of(2026, 3, 10), "998313",
                        "150000.00", 18.0, "13500.00", "13500.00", "0.00", "177000.00",
                        "B2B", "Issued", "27", "Enterprise cloud consulting retainer", "admin"),

                salesInv("SINV-2026-102", merchantId, "Infosys Technologies Bangalore", "29AAACI4747B1ZB",
                        "INV/2026/090", LocalDate.of(2026, 2, 15), LocalDate.of(2026, 3, 15), "998315",
                        "280000.00", 18.0, "0.00", "0.00", "50400.00", "330400.00",
                        "B2B", "Issued", "29", "Interstate software subscription license", "admin"),

                salesInv("SINV-2026-103", merchantId, "Aarav Sharma (Delhi Client)", null,
                        "INV/2026/091", LocalDate.of(2026, 2, 20), LocalDate.of(2026, 3, 20), "8471",
                        "260000.00", 18.0, "0.00", "0.00", "46800.00", "306800.00",
                        "B2C", "Issued", "07", "Interstate high-value server asset delivery (B2C Large > ₹2.5L)", "admin"),

                salesInv("SINV-2026-104", merchantId, "Pooja Deshmukh (Pune Retail)", null,
                        "INV/2026/092", LocalDate.of(2026, 2, 22), LocalDate.of(2026, 3, 22), "4820",
                        "14500.00", 12.0, "870.00", "870.00", "0.00", "16240.00",
                        "B2C", "Issued", "27", "Intrastate stationery supplies retail order", "admin"),

                salesInv("SINV-2026-105", merchantId, "Kavita Reddy (Hyderabad Consumer)", null,
                        "INV/2026/093", LocalDate.of(2026, 2, 25), LocalDate.of(2026, 3, 25), "998315",
                        "35000.00", 18.0, "0.00", "0.00", "6300.00", "41300.00",
                        "B2C", "Issued", "36", "Interstate online software access (B2C Small <= ₹2.5L)", "admin"),

                salesInv("SINV-2026-106", merchantId, "Acme Global Corp (USA)", null,
                        "INV/2026/094", LocalDate.of(2026, 2, 28), LocalDate.of(2026, 3, 28), "998313",
                        "400000.00", 0.0, "0.00", "0.00", "0.00", "400000.00",
                        "EXPORT", "Issued", "96", "Export of IT enabled services under LUT (Zero-rated)", "admin")
        );

        salesInvoiceRepository.saveAll(demoSales);
        log.info("Seeded {} demo sales invoices (B2B, B2C Large, B2C Small, Exports)", demoSales.size());
    }

    private com.billwise.backend.entity.SalesInvoice salesInv(String id, String merchantId, String customerName, String customerGstin,
                                  String invoiceNumber, LocalDate invoiceDate, LocalDate dueDate, String hsnSac,
                                  String taxableAmount, Double gstRate, String cgst, String sgst, String igst,
                                  String totalAmount, String supplyType, String status, String placeOfSupply,
                                  String notes, String createdBy) {
        com.billwise.backend.entity.SalesInvoice s = new com.billwise.backend.entity.SalesInvoice();
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
