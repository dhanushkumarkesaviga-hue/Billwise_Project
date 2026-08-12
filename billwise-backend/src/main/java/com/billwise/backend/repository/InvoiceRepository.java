package com.billwise.backend.repository;

import com.billwise.backend.entity.Invoice;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface InvoiceRepository extends MongoRepository<Invoice, String> {

    List<Invoice> findByMerchantId(String merchantId);

    List<Invoice> findByMerchantIdAndStatus(String merchantId, String status);

    List<Invoice> findByMerchantIdAndPaymentStatus(String merchantId, String paymentStatus);

    Optional<Invoice> findByIdAndMerchantId(String id, String merchantId);

    void deleteByIdAndMerchantId(String id, String merchantId);

    List<Invoice> findByStatus(String status);

    List<Invoice> findByPaymentStatus(String paymentStatus);
}
