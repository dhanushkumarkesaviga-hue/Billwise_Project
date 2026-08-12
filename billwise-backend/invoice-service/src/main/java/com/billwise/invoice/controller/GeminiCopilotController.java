package com.billwise.invoice.controller;

import com.billwise.invoice.dto.InvoiceDtos.ChatRequest;
import com.billwise.invoice.dto.InvoiceDtos.ChatResponse;
import com.billwise.invoice.entity.ChatMessage;
import com.billwise.invoice.security.AuthenticatedUser;
import com.billwise.invoice.service.OllamaCopilotService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/copilot")
@RequiredArgsConstructor
public class GeminiCopilotController {

    private final OllamaCopilotService copilotService;

    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(
            @Valid @RequestBody ChatRequest request,
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        return ResponseEntity.ok(copilotService.chat(request, user));
    }

    @GetMapping("/history/{sessionId}")
    public ResponseEntity<List<ChatMessage>> getHistory(@PathVariable("sessionId") String sessionId) {
        return ResponseEntity.ok(copilotService.getHistory(sessionId));
    }
}
