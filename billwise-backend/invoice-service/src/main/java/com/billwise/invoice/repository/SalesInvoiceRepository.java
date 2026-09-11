package com.billwise.invoice.repository;

import com.billwise.invoice.entity.SalesInvoice;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SalesInvoiceRepository extends MongoRepository<SalesInvoice, String> {

    List<SalesInvoice> findByMerchantId(String merchantId);

    List<SalesInvoice> findByMerchantIdAndInvoiceDateBetween(String merchantId, LocalDate from, LocalDate to);

    List<SalesInvoice> findByMerchantIdAndStatus(String merchantId, String status);

    List<SalesInvoice> findByMerchantIdAndSupplyType(String merchantId, String supplyType);

    Optional<SalesInvoice> findByIdAndMerchantId(String id, String merchantId);

    void deleteByIdAndMerchantId(String id, String merchantId);

    boolean existsByMerchantIdAndInvoiceNumber(String merchantId, String invoiceNumber);

    long countByMerchantId(String merchantId);
}
