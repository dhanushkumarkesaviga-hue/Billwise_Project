package com.billwise.backend.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "chat_messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {

    @Id
    private String id;

    // Groups messages into a single copilot conversation. A single browser
    // session sends the same sessionId for every message so history can be
    // replayed back into the (stateless) Gemini API call.
    private String sessionId;

    // "user" | "model"
    private String role;

    private String content;

    private String username;

    private String merchantId;

    private Instant createdAt = Instant.now();
}
