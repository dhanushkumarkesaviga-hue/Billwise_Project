package com.billwise.gst.repository;

import com.billwise.gst.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    List<Invoice> findByTenantId(String tenantId);

    Optional<Invoice> findByTenantIdAndInvoiceNumber(String tenantId, String invoiceNumber);
}
