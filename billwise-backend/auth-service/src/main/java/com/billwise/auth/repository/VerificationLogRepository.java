package com.billwise.auth.repository;

import com.billwise.auth.entity.VerificationLog;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface VerificationLogRepository extends MongoRepository<VerificationLog, String> {

    List<VerificationLog> findByMerchantIdOrderByTimestampDesc(String merchantId);
}
