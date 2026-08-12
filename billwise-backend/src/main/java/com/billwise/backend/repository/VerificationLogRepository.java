package com.billwise.backend.repository;

import com.billwise.backend.entity.VerificationLog;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VerificationLogRepository extends MongoRepository<VerificationLog, String> {

    List<VerificationLog> findByMerchantIdOrderByTimestampDesc(String merchantId);
}
