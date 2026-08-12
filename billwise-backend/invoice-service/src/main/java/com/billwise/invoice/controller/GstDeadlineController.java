package com.billwise.invoice.controller;

import com.billwise.invoice.service.GstDeadlineService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
