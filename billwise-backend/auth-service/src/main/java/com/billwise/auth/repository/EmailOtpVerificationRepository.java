package com.billwise.auth.repository;

import com.billwise.auth.entity.EmailOtpVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmailOtpVerificationRepository extends JpaRepository<EmailOtpVerification, String> {

    Optional<EmailOtpVerification> findTopByEmailIgnoreCaseOrderByCreatedAtDesc(String email);

    Optional<EmailOtpVerification> findTopByEmailIgnoreCaseAndPurposeOrderByCreatedAtDesc(String email, String purpose);

    Optional<EmailOtpVerification> findTopByEmailIgnoreCaseAndPurposeAndVerifiedTrueOrderByCreatedAtDesc(String email, String purpose);

    void deleteByEmailIgnoreCase(String email);

    void deleteByEmailIgnoreCaseAndPurpose(String email, String purpose);
}
