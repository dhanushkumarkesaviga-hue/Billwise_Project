package com.billwise.backend.repository;

import com.billwise.backend.entity.EmailOtpVerification;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmailOtpVerificationRepository extends MongoRepository<EmailOtpVerification, String> {

    Optional<EmailOtpVerification> findTopByEmailIgnoreCaseAndPurposeOrderByCreatedAtDesc(String email, String purpose);

    Optional<EmailOtpVerification> findTopByEmailIgnoreCaseOrderByCreatedAtDesc(String email);

    void deleteByEmailIgnoreCaseAndPurpose(String email, String purpose);
}
