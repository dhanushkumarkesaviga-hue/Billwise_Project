package com.billwise.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChatRequest {

    @NotBlank(message = "message must not be blank")
    private String message;

    // Client-generated id (e.g. a UUID stored in localStorage) identifying
    // this copilot conversation so history can be persisted and replayed.
    @NotBlank(message = "sessionId must not be blank")
    private String sessionId;
}
