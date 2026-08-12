package com.billwise.backend.repository;

import com.billwise.backend.entity.GstDeadline;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface GstDeadlineRepository extends MongoRepository<GstDeadline, String> {
}
