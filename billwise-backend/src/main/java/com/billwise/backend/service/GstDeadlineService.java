package com.billwise.backend.service;

import com.billwise.backend.entity.GstDeadline;
import com.billwise.backend.repository.GstDeadlineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class GstDeadlineService {

    private final GstDeadlineRepository gstDeadlineRepository;

    public List<Map<String, Object>> getAllDeadlines() {
        return gstDeadlineRepository.findAll().stream()
                .sorted(Comparator.comparing(GstDeadline::getDueDate))
                .map(this::toResponse)
                .toList();
    }

    // daysRemaining is derived from today's date rather than stored, so it
    // stays correct without a scheduled job.
    private Map<String, Object> toResponse(GstDeadline d) {
        long daysRemaining = ChronoUnit.DAYS.between(LocalDate.now(), d.getDueDate());

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", d.getId());
        map.put("formName", d.getFormName());
        map.put("title", d.getTitle());
        map.put("frequency", d.getFrequency());
        map.put("dueDate", d.getDueDate());
        map.put("daysRemaining", daysRemaining);
        map.put("status", daysRemaining < 0 ? "Overdue" : d.getStatus());
        map.put("description", d.getDescription());
        map.put("lateFeePerDay", d.getLateFeePerDay());
        map.put("maxPenalty", d.getMaxPenalty());
        map.put("impact", d.getImpact());
        return map;
    }
}
