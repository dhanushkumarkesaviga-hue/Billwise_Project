package com.billwise.invoice.service;

import com.billwise.invoice.entity.GstDeadline;
import com.billwise.invoice.entity.Invoice;
import com.billwise.invoice.repository.GstDeadlineRepository;
import com.billwise.invoice.repository.InvoiceRepository;
import com.billwise.invoice.security.AuthenticatedUser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class GstDeadlineService {

    private final GstDeadlineRepository gstDeadlineRepository;
    private final InvoiceRepository invoiceRepository;

    public static final BigDecimal FIVE_CRORE = new BigDecimal("50000000");

    public List<Map<String, Object>> getAllDeadlines() {
        return gstDeadlineRepository.findAll().stream()
                .sorted(Comparator.comparing(GstDeadline::getDueDate))
                .map(this::toResponse)
                .toList();
    }

    public Map<String, Object> getPersonalizedDeadlines(AuthenticatedUser user) {
        String merchantId = user != null ? user.getMerchantId() : null;
        String gstin = "27AAACB2234P1Z8";
        String stateCode = "27";
        String taxpayerType = "REGULAR";
        String turnoverSlab = "UP_TO_1_5_CR";
        String filingFrequency = "MONTHLY";
        boolean emailReminders = true;

        BigDecimal recordedTurnover = BigDecimal.ZERO;
        if (merchantId != null) {
            List<Invoice> invoices = invoiceRepository.findByMerchantId(merchantId);
            recordedTurnover = invoices.stream()
                    .map(Invoice::getTotalAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            Optional<Invoice> firstInvWithGstin = invoices.stream()
                    .filter(inv -> inv.getGstin() != null && inv.getGstin().length() >= 2)
                    .findFirst();
            if (firstInvWithGstin.isPresent()) {
                gstin = firstInvWithGstin.get().getGstin();
                stateCode = gstin.substring(0, 2);
            }
        }

        if (recordedTurnover.compareTo(FIVE_CRORE) >= 0) {
            turnoverSlab = "ABOVE_5_CR";
            filingFrequency = "MONTHLY";
        }

        BigDecimal threshold = FIVE_CRORE;
        double percentage = threshold.compareTo(BigDecimal.ZERO) > 0
                ? recordedTurnover.divide(threshold, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")).doubleValue()
                : 0.0;
        boolean isExceeded = recordedTurnover.compareTo(threshold) >= 0;

        List<Map<String, Object>> schedule = GstDeadlineRuleEngine.generateSchedule(
                gstin,
                stateCode,
                taxpayerType,
                turnoverSlab,
                filingFrequency,
                LocalDate.now()
        );

        Map<String, Object> merchantInfo = new LinkedHashMap<>();
        merchantInfo.put("legalName", user != null ? user.getUsername() + " Enterprise" : "BillWise Enterprise");
        merchantInfo.put("tradeName", "");
        merchantInfo.put("gstin", gstin);
        merchantInfo.put("state", "Maharashtra");
        merchantInfo.put("stateCode", stateCode);
        merchantInfo.put("stateCategory", GstDeadlineRuleEngine.getStateCategoryName(stateCode));
        merchantInfo.put("taxpayerType", taxpayerType);
        merchantInfo.put("turnoverSlab", turnoverSlab);
        merchantInfo.put("filingFrequency", filingFrequency);
        merchantInfo.put("autoBumpedToMonthly", isExceeded);
        merchantInfo.put("emailRemindersEnabled", emailReminders);
        merchantInfo.put("contactEmail", user != null ? user.getUsername() + "@billwise.in" : "admin@billwise.in");

        Map<String, Object> turnoverStats = new LinkedHashMap<>();
        turnoverStats.put("currentFyTurnover", recordedTurnover);
        turnoverStats.put("statutoryThreshold", threshold);
        turnoverStats.put("percentageOfThreshold", Math.min(percentage, 100.0));
        turnoverStats.put("rawPercentage", percentage);
        turnoverStats.put("isThresholdExceeded", isExceeded);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("merchantInfo", merchantInfo);
        response.put("turnoverStats", turnoverStats);
        response.put("deadlines", schedule);
        return response;
    }

    public boolean triggerTestReminder(AuthenticatedUser user) {
        log.info("Triggered statutory 3-day GST deadline test reminder alert for user: {}", user != null ? user.getUsername() : "anonymous");
        return true;
    }

    public Map<String, Object> updateDeadlinePreferences(AuthenticatedUser user, Boolean emailRemindersEnabled, String filingFrequency) {
        Map<String, Object> updated = new LinkedHashMap<>();
        updated.put("emailRemindersEnabled", emailRemindersEnabled != null ? emailRemindersEnabled : true);
        updated.put("filingFrequency", filingFrequency != null ? filingFrequency : "MONTHLY");
        return updated;
    }

    private Map<String, Object> toResponse(GstDeadline d) {
        long daysRemaining = ChronoUnit.DAYS.between(LocalDate.now(), d.getDueDate());

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", d.getId());
        map.put("formName", d.getFormName());
        map.put("title", d.getTitle());
        map.put("frequency", d.getFrequency());
        map.put("dueDate", d.getDueDate().toString());
        map.put("daysRemaining", daysRemaining);
        map.put("status", daysRemaining < 0 ? "Overdue" : d.getStatus());
        map.put("description", d.getDescription());
        map.put("lateFeePerDay", d.getLateFeePerDay());
        map.put("maxPenalty", d.getMaxPenalty());
        map.put("impact", d.getImpact());
        map.put("isNearDeadline", daysRemaining >= 0 && daysRemaining <= 3);
        return map;
    }
}

