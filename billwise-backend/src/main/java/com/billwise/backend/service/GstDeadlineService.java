package com.billwise.backend.service;

import com.billwise.backend.entity.GstDeadline;
import com.billwise.backend.entity.Merchant;
import com.billwise.backend.entity.User;
import com.billwise.backend.exception.BadRequestException;
import com.billwise.backend.repository.GstDeadlineRepository;
import com.billwise.backend.repository.MerchantRepository;
import com.billwise.backend.repository.UserRepository;
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
    private final MerchantRepository merchantRepository;
    private final UserRepository userRepository;
    private final InvoiceService invoiceService;
    private final EmailService emailService;

    public List<Map<String, Object>> getAllDeadlines() {
        return gstDeadlineRepository.findAll().stream()
                .sorted(Comparator.comparing(GstDeadline::getDueDate))
                .map(this::toResponse)
                .toList();
    }

    public Map<String, Object> getPersonalizedDeadlines(String username) {
        Merchant merchant = null;
        if (username != null) {
            Optional<User> userOpt = userRepository.findByUsername(username);
            if (userOpt.isPresent() && userOpt.get().getMerchantId() != null) {
                merchant = merchantRepository.findById(userOpt.get().getMerchantId()).orElse(null);
            }
        }

        String gstin = merchant != null ? merchant.getGstin() : "27AAACB2234P1Z8";
        String stateCode = merchant != null && merchant.getStateCode() != null ? merchant.getStateCode() : gstin.substring(0, 2);
        String taxpayerType = merchant != null && merchant.getTaxpayerType() != null ? merchant.getTaxpayerType() : "REGULAR";
        String turnoverSlab = merchant != null && merchant.getTurnoverSlab() != null ? merchant.getTurnoverSlab() : "UP_TO_1_5_CR";
        String filingFrequency = merchant != null && merchant.getFilingFrequency() != null ? merchant.getFilingFrequency() : "MONTHLY";
        boolean autoBumped = merchant != null && merchant.isAutoBumpedToMonthly();
        boolean emailReminders = merchant == null || merchant.isEmailRemindersEnabled();

        BigDecimal recordedTurnover = merchant != null
                ? invoiceService.calculateCurrentFyTurnover(merchant.getId())
                : BigDecimal.ZERO;

        BigDecimal threshold = InvoiceService.FIVE_CRORE;
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
        merchantInfo.put("legalName", merchant != null ? merchant.getLegalName() : "BillWise Enterprise");
        merchantInfo.put("tradeName", merchant != null ? merchant.getTradeName() : "");
        merchantInfo.put("gstin", gstin);
        merchantInfo.put("state", merchant != null ? merchant.getState() : "Maharashtra");
        merchantInfo.put("stateCode", stateCode);
        merchantInfo.put("stateCategory", GstDeadlineRuleEngine.getStateCategoryName(stateCode));
        merchantInfo.put("taxpayerType", taxpayerType);
        merchantInfo.put("turnoverSlab", turnoverSlab);
        merchantInfo.put("filingFrequency", filingFrequency);
        merchantInfo.put("autoBumpedToMonthly", autoBumped);
        merchantInfo.put("emailRemindersEnabled", emailReminders);
        merchantInfo.put("contactEmail", merchant != null ? merchant.getContactEmail() : "");

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

    public boolean triggerTestReminder(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BadRequestException("User not found"));

        if (user.getMerchantId() == null) {
            throw new BadRequestException("User is not linked to a merchant.");
        }

        Merchant merchant = merchantRepository.findById(user.getMerchantId())
                .orElseThrow(() -> new BadRequestException("Merchant not found"));

        String stateCode = merchant.getStateCode() != null ? merchant.getStateCode() : merchant.getGstin().substring(0, 2);
        List<Map<String, Object>> schedule = GstDeadlineRuleEngine.generateSchedule(
                merchant.getGstin(),
                stateCode,
                merchant.getTaxpayerType(),
                merchant.getTurnoverSlab(),
                merchant.getFilingFrequency(),
                LocalDate.now()
        );

        if (schedule.isEmpty()) {
            throw new BadRequestException("No upcoming deadlines available to send.");
        }

        Map<String, Object> firstDeadline = schedule.get(0);
        String formName = (String) firstDeadline.get("formName");
        String title = (String) firstDeadline.get("title");
        LocalDate dueDate = LocalDate.parse((String) firstDeadline.get("dueDate"));
        long daysRemaining = ((Number) firstDeadline.get("daysRemaining")).longValue();
        int lateFee = ((Number) firstDeadline.get("lateFeePerDay")).intValue();
        int maxPenalty = ((Number) firstDeadline.get("maxPenalty")).intValue();

        return emailService.sendGstDeadlineReminderEmail(
                merchant.getContactEmail(),
                merchant.getLegalName(),
                formName,
                title,
                dueDate,
                daysRemaining,
                lateFee,
                maxPenalty,
                true
        );
    }

    public Merchant updateDeadlinePreferences(String username, Boolean emailRemindersEnabled, String filingFrequency) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BadRequestException("User not found"));

        if (user.getMerchantId() == null) {
            throw new BadRequestException("User is not linked to a merchant.");
        }

        Merchant merchant = merchantRepository.findById(user.getMerchantId())
                .orElseThrow(() -> new BadRequestException("Merchant not found"));

        if (emailRemindersEnabled != null) {
            merchant.setEmailRemindersEnabled(emailRemindersEnabled);
        }

        if (filingFrequency != null && !filingFrequency.isBlank()) {
            if ("ABOVE_5_CR".equalsIgnoreCase(merchant.getTurnoverSlab()) && !"MONTHLY".equalsIgnoreCase(filingFrequency)) {
                throw new BadRequestException("Turnover exceeds ₹5 Crore. Statutory CGST Rules mandate Monthly filing (GSTR-1 & GSTR-3B).");
            }
            merchant.setFilingFrequency(filingFrequency.trim().toUpperCase());
        }

        return merchantRepository.save(merchant);
    }

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
        map.put("isNearDeadline", daysRemaining >= 0 && daysRemaining <= 3);
        return map;
    }
}
