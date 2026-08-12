package com.billwise.backend.controller;

import com.billwise.backend.dto.ChatMessageDto;
import com.billwise.backend.dto.ChatRequest;
import com.billwise.backend.dto.ChatResponse;
import com.billwise.backend.service.GeminiCopilotService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/copilot")
@RequiredArgsConstructor
public class CopilotController {

    private final GeminiCopilotService copilotService;

    @PostMapping("/chat")
    public ChatResponse chat(@Valid @RequestBody ChatRequest request) {
        String reply = copilotService.chat(request.getSessionId(), request.getMessage());
        return new ChatResponse(reply, request.getSessionId());
    }

    @GetMapping("/history/{sessionId}")
    public List<ChatMessageDto> getHistory(@PathVariable("sessionId") String sessionId) {
        return copilotService.getHistory(sessionId);
    }

    @DeleteMapping("/history/{sessionId}")
    public ResponseEntity<Void> clearHistory(@PathVariable("sessionId") String sessionId) {
        copilotService.clearHistory(sessionId);
        return ResponseEntity.noContent().build();
    }
}
