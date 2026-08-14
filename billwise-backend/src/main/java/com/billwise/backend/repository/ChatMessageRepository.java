package com.billwise.backend.repository;

import com.billwise.backend.entity.ChatMessage;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ChatMessageRepository extends MongoRepository<ChatMessage, String> {

    List<ChatMessage> findBySessionIdOrderByCreatedAtAsc(String sessionId);

    List<ChatMessage> findByUsernameAndSessionIdOrderByCreatedAtAsc(String username, String sessionId);

    List<ChatMessage> findByUsernameOrderByCreatedAtAsc(String username);

    void deleteBySessionId(String sessionId);

    void deleteByUsernameAndSessionId(String username, String sessionId);
}
