package com.billwise.auth.repository;

import com.billwise.auth.entity.VerificationLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VerificationLogRepository extends JpaRepository<VerificationLog, String> {

    List<VerificationLog> findByMerchantIdOrderByTimestampDesc(String merchantId);
}
