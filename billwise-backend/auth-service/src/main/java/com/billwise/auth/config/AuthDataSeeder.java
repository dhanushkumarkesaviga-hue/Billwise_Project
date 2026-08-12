package com.billwise.auth.config;

import com.billwise.auth.entity.Merchant;
import com.billwise.auth.entity.User;
import com.billwise.auth.entity.VerificationLog;
import com.billwise.auth.repository.MerchantRepository;
import com.billwise.auth.repository.UserRepository;
import com.billwise.auth.repository.VerificationLogRepository;
import com.billwise.common.entity.MerchantStatus;
import com.billwise.common.entity.Role;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class AuthDataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final MerchantRepository merchantRepository;
    private final VerificationLogRepository verificationLogRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        seedMerchantsAndUsers();
    }

    private void seedMerchantsAndUsers() {
        // 1. Seed SUPER_ADMIN
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
            log.info("Seeded SUPER_ADMIN user - superadmin / SuperAdmin@123");
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
        }

        // Demo pending merchant (Apex Logistics)
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
            m1.setStatus(MerchantStatus.VERIFIED);
            m1.setAdminUsername("apex_admin");
            m1.setVerifiedBy("superadmin");
            m1.setVerifiedAt(Instant.now().minusSeconds(86400 * 2));
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

        log.info("Auth service initialization and data seeding completed.");
    }
}
