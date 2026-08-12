package com.billwise.invoice.repository;

import com.billwise.invoice.entity.GstDeadline;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface GstDeadlineRepository extends MongoRepository<GstDeadline, String> {

    List<GstDeadline> findByStatus(String status);
}
