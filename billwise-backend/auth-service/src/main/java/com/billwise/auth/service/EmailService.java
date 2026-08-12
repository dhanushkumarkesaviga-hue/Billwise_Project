package com.billwise.auth.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailSenderUsername;

    /**
     * Sends a 6-digit verification OTP code to the recipient's email via Gmail SMTP.
     * Uses clean plain text email to maximize deliverability and avoid spam filters.
     * If SMTP credentials are not configured or sending fails, gracefully falls back to dev logging.
     *
     * @param toEmail The destination email
     * @param otpCode The 6-digit numeric OTP
     * @param expiryMinutes Validity in minutes (default 10)
     * @return true if real email was sent via Gmail SMTP, false if simulated/fallback
     */
    public boolean sendSignupOtpEmail(String toEmail, String otpCode, int expiryMinutes) {
        if (mailSender == null || mailSenderUsername == null || mailSenderUsername.trim().isEmpty()) {
            log.info("📧 [OTP EMAIL SIMULATOR] (No SMTP credentials configured in application.yml) Generated OTP [{}] for: {}", otpCode, toEmail);
            return false;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailSenderUsername.trim());
            message.setTo(toEmail.trim());
            message.setSubject("Your BillWise verification code: " + otpCode);
            message.setText(
                    "Hello,\n\n" +
                    "Your BillWise verification code is: " + otpCode + "\n\n" +
                    "This code is valid for " + expiryMinutes + " minutes. Please enter it in the signup screen to verify your email address.\n\n" +
                    "If you did not request this verification code, please ignore this email.\n\n" +
                    "— The BillWise Team"
            );

            mailSender.send(message);
            log.info("✅ [REAL EMAIL DELIVERED] Verification OTP email successfully dispatched to [{}] via Gmail SMTP", toEmail);
            return true;
        } catch (Exception e) {
            log.warn("⚠️ [EMAIL DELIVERY FAILED] Could not deliver email to {}: {}. Falling back to dev OTP code [{}]",
                    toEmail, e.getMessage(), otpCode);
            return false;
        }
    }

    public boolean sendSignupOtpEmail(String toEmail, String otpCode) {
        return sendSignupOtpEmail(toEmail, otpCode, 10);
    }
}
