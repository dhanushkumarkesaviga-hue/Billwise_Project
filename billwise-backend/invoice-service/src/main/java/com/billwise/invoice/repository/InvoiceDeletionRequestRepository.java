package com.billwise.invoice.repository;

import com.billwise.invoice.entity.InvoiceDeletionRequest;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InvoiceDeletionRequestRepository extends MongoRepository<InvoiceDeletionRequest, String> {

    List<InvoiceDeletionRequest> findByMerchantIdOrderByCreatedAtDesc(String merchantId);

    List<InvoiceDeletionRequest> findByMerchantIdAndStatusOrderByCreatedAtDesc(String merchantId, String status);

    List<InvoiceDeletionRequest> findByRequestedByUsernameOrderByCreatedAtDesc(String requestedByUsername);

    List<InvoiceDeletionRequest> findByStatusOrderByCreatedAtDesc(String status);

    List<InvoiceDeletionRequest> findAllByOrderByCreatedAtDesc();

    boolean existsByInvoiceIdAndStatus(String invoiceId, String status);
}
