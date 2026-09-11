package com.billwise.invoice.controller;

import com.billwise.invoice.security.AuthenticatedUser;
import com.billwise.invoice.service.GstDeadlineService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

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
    public ResponseEntity<Map<String, Object>> getPersonalizedDeadlines(@AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(gstDeadlineService.getPersonalizedDeadlines(user));
    }

    @PostMapping("/trigger-reminder-test")
    public ResponseEntity<Map<String, Object>> triggerTestReminder(@AuthenticationPrincipal AuthenticatedUser user) {
        boolean sent = gstDeadlineService.triggerTestReminder(user);
        return ResponseEntity.ok(Map.of(
                "success", sent,
                "message", "Test statutory 3-day GST deadline reminder dispatched successfully!"
        ));
    }

    @PutMapping("/preferences")
    public ResponseEntity<Map<String, Object>> updatePreferences(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestBody Map<String, Object> body
    ) {
        Boolean reminders = body.containsKey("emailRemindersEnabled") ? (Boolean) body.get("emailRemindersEnabled") : null;
        String frequency = body.containsKey("filingFrequency") ? (String) body.get("filingFrequency") : null;

        Map<String, Object> updated = gstDeadlineService.updateDeadlinePreferences(user, reminders, frequency);
        return ResponseEntity.ok(updated);
    }
}

