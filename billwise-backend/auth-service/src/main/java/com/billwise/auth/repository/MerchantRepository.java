package com.billwise.auth.repository;

import com.billwise.auth.entity.Merchant;
import com.billwise.common.entity.MerchantStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface MerchantRepository extends MongoRepository<Merchant, String> {

    Optional<Merchant> findByGstin(String gstin);

    boolean existsByGstin(String gstin);

    Optional<Merchant> findByAdminUsername(String adminUsername);

    List<Merchant> findByStatus(MerchantStatus status);

    List<Merchant> findByTradeNameContainingIgnoreCase(String tradeName);

    Optional<Merchant> findByContactEmailIgnoreCase(String contactEmail);
}
