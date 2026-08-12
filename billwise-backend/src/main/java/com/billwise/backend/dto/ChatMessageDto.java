package com.billwise.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class ChatMessageDto {
    // "user" | "ai"  (mapped from entity role "user" | "model" to match the
    // sender field the AiCopilotDrawer.jsx component already expects)
    private String sender;
    private String text;
}
