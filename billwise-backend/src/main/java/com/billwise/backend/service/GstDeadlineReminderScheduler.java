package com.billwise.backend.service;

import com.billwise.backend.entity.Merchant;
import com.billwise.backend.repository.MerchantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
@RequiredArgsConstructor
public class GstDeadlineReminderScheduler {

    private final MerchantRepository merchantRepository;
    private final EmailService emailService;

    /**
     * Daily background job at 9:00 AM to check upcoming deadlines for all active merchants.
     * Automatically dispatches reminder emails if a deadline is exactly 3 days away.
     */
    @Scheduled(cron = "0 0 9 * * ?")
    public void runDailyDeadlineReminderCheck() {
        log.info("[GST DEADLINE CRON] Starting daily 3-day advance statutory deadline reminder check...");
        int sentCount = processAllMerchantDeadlines(false);
        log.info("[GST DEADLINE CRON] Completed check. Dispatched {} statutory reminder email(s).", sentCount);
    }

    public int processAllMerchantDeadlines(boolean isTestRun) {
        List<Merchant> merchants = merchantRepository.findAll();
        int emailCount = 0;
        LocalDate today = LocalDate.now();

        for (Merchant merchant : merchants) {
            if (!merchant.isEmailRemindersEnabled()) {
                continue;
            }

            String targetEmail = merchant.getContactEmail();
            if (targetEmail == null || targetEmail.isBlank()) {
                continue;
            }

            String stateCode = merchant.getStateCode() != null ? merchant.getStateCode() : (merchant.getGstin() != null && merchant.getGstin().length() >= 2 ? merchant.getGstin().substring(0, 2) : "27");
            List<Map<String, Object>> schedule = GstDeadlineRuleEngine.generateSchedule(
                    merchant.getGstin(),
                    stateCode,
                    merchant.getTaxpayerType(),
                    merchant.getTurnoverSlab(),
                    merchant.getFilingFrequency(),
                    today
            );

            for (Map<String, Object> deadline : schedule) {
                long daysRemaining = ((Number) deadline.get("daysRemaining")).longValue();

                // Trigger if deadline is 3 days away (or for test run, first upcoming item)
                if (daysRemaining == 3 || isTestRun) {
                    String formName = (String) deadline.get("formName");
                    String title = (String) deadline.get("title");
                    LocalDate dueDate = LocalDate.parse((String) deadline.get("dueDate"));
                    int lateFee = ((Number) deadline.get("lateFeePerDay")).intValue();
                    int maxPenalty = ((Number) deadline.get("maxPenalty")).intValue();

                    boolean sent = emailService.sendGstDeadlineReminderEmail(
                            targetEmail,
                            merchant.getLegalName(),
                            formName,
                            title,
                            dueDate,
                            daysRemaining,
                            lateFee,
                            maxPenalty,
                            isTestRun
                    );

                    if (sent || isTestRun) {
                        emailCount++;
                    }

                    if (isTestRun) {
                        break; // Only test 1 item per merchant in test mode
                    }
                }
            }
        }
        return emailCount;
    }
}
