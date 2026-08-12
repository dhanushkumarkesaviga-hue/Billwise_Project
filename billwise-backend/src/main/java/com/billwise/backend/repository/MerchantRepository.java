package com.billwise.backend.repository;

import com.billwise.backend.entity.Merchant;
import com.billwise.backend.entity.MerchantStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MerchantRepository extends MongoRepository<Merchant, String> {

    Optional<Merchant> findByGstin(String gstin);

    Optional<Merchant> findByAdminUsername(String adminUsername);

    List<Merchant> findByStatus(MerchantStatus status);

    List<Merchant> findByStatusOrderByCreatedAtDesc(MerchantStatus status);

    List<Merchant> findAllByOrderByCreatedAtDesc();

    boolean existsByGstin(String gstin);

    boolean existsByPan(String pan);

    List<Merchant> findByContactPhone(String contactPhone);

    List<Merchant> findByContactEmail(String contactEmail);
}
