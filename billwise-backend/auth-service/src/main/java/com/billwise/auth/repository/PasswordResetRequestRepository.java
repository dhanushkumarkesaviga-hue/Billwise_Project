package com.billwise.auth.repository;

import com.billwise.auth.entity.PasswordResetRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PasswordResetRequestRepository extends JpaRepository<PasswordResetRequest, String> {
    List<PasswordResetRequest> findByMerchantIdOrderByCreatedAtDesc(String merchantId);
    List<PasswordResetRequest> findByMerchantIdAndStatusOrderByCreatedAtDesc(String merchantId, String status);
    List<PasswordResetRequest> findByAdminUsernameIgnoreCaseOrderByCreatedAtDesc(String adminUsername);
    List<PasswordResetRequest> findByAdminUsernameIgnoreCaseAndStatusOrderByCreatedAtDesc(String adminUsername, String status);
    Optional<PasswordResetRequest> findTopByUsernameIgnoreCaseOrderByCreatedAtDesc(String username);
    List<PasswordResetRequest> findByStatusOrderByCreatedAtDesc(String status);
}
