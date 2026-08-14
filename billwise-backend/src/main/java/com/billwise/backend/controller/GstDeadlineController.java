package com.billwise.backend.controller;

import com.billwise.backend.dto.MerchantResponse;
import com.billwise.backend.entity.Merchant;
import com.billwise.backend.service.GstDeadlineService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/deadlines")
@RequiredArgsConstructor
public class GstDeadlineController {

    private final GstDeadlineService gstDeadlineService;

    @GetMapping
    public List<Map<String, Object>> getAllDeadlines() {
        return gstDeadlineService.getAllDeadlines();
    }

    @GetMapping("/personalized")
    public ResponseEntity<Map<String, Object>> getPersonalizedDeadlines(Principal principal) {
        String username = principal != null ? principal.getName() : null;
        return ResponseEntity.ok(gstDeadlineService.getPersonalizedDeadlines(username));
    }

    @PostMapping("/trigger-reminder-test")
    public ResponseEntity<Map<String, Object>> triggerTestReminder(Principal principal) {
        if (principal == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Authentication required."));
        }
        boolean sent = gstDeadlineService.triggerTestReminder(principal.getName());
        return ResponseEntity.ok(Map.of(
                "success", sent,
                "message", sent
                        ? "Test statutory GST deadline email reminder dispatched successfully via SMTP!"
                        : "Simulated test reminder executed (Check server logs if SMTP is unconfigured)."
        ));
    }

    @PutMapping("/preferences")
    public ResponseEntity<MerchantResponse> updatePreferences(
            Principal principal,
            @RequestBody Map<String, Object> body
    ) {
        if (principal == null) {
            return ResponseEntity.badRequest().build();
        }
        Boolean reminders = body.containsKey("emailRemindersEnabled") ? (Boolean) body.get("emailRemindersEnabled") : null;
        String frequency = body.containsKey("filingFrequency") ? (String) body.get("filingFrequency") : null;

        Merchant updated = gstDeadlineService.updateDeadlinePreferences(principal.getName(), reminders, frequency);
        return ResponseEntity.ok(MerchantResponse.fromEntity(updated));
    }
}
