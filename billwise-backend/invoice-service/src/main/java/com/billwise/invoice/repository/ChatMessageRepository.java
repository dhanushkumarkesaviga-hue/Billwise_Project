package com.billwise.invoice.repository;

import com.billwise.invoice.entity.ChatMessage;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ChatMessageRepository extends MongoRepository<ChatMessage, String> {

    List<ChatMessage> findBySessionIdOrderByTimestampAsc(String sessionId);
}
