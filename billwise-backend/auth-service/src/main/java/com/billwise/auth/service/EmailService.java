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

    /**
     * Sends a 6-digit password reset OTP code to the user's registered email.
     *
     * @param toEmail Destination email
     * @param otpCode 6-digit numeric OTP code
     * @param expiryMinutes Expiration in minutes (default 15)
     * @return true if sent via real SMTP, false if dev fallback
     */
    public boolean sendPasswordResetOtpEmail(String toEmail, String otpCode, int expiryMinutes) {
        if (mailSender == null || mailSenderUsername == null || mailSenderUsername.trim().isEmpty()) {
            log.info("📧 [PASSWORD RESET OTP SIMULATOR] Generated OTP [{}] for user email: {}", otpCode, toEmail);
            return false;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailSenderUsername.trim());
            message.setTo(toEmail.trim());
            message.setSubject("BillWise Password Reset Code: " + otpCode);
            message.setText(
                    "Hello,\n\n" +
                    "We received a request to reset the password for your BillWise account.\n\n" +
                    "Your 6-digit Password Reset OTP is: " + otpCode + "\n\n" +
                    "This code will expire in " + expiryMinutes + " minutes. Enter this code on the password reset screen to set your new password.\n\n" +
                    "If you did not request a password reset, please ignore this email or contact your administrator immediately.\n\n" +
                    "— The BillWise Security Team"
            );

            mailSender.send(message);
            log.info("✅ [REAL EMAIL DELIVERED] Password Reset OTP successfully dispatched to [{}] via Gmail SMTP", toEmail);
            return true;
        } catch (Exception e) {
            log.warn("⚠️ [EMAIL DELIVERY FAILED] Could not deliver password reset email to {}: {}. Falling back to dev OTP code [{}]",
                    toEmail, e.getMessage(), otpCode);
            return false;
        }
    }

    public boolean sendPasswordResetOtpEmail(String toEmail, String otpCode) {
        return sendPasswordResetOtpEmail(toEmail, otpCode, 15);
    }

    /**
     * Sends a 6-digit verification code to the user's new email address when changing account email.
     * Includes clear security warnings about transfer of account credentials and alerts.
     *
     * @param newEmail The new destination email
     * @param currentUsername The username requesting the change
     * @param otpCode 6-digit numeric OTP code
     * @param expiryMinutes Validity in minutes (default 10)
     * @return true if sent via real SMTP, false if dev fallback
     */
    public boolean sendEmailChangeOtpEmail(String newEmail, String currentUsername, String otpCode, int expiryMinutes) {
        if (mailSender == null || mailSenderUsername == null || mailSenderUsername.trim().isEmpty()) {
            log.info("📧 [EMAIL CHANGE OTP SIMULATOR] Generated OTP [{}] for new email: {} (User: @{})", otpCode, newEmail, currentUsername);
            return false;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailSenderUsername.trim());
            message.setTo(newEmail.trim());
            message.setSubject("BillWise Security: Verification Code to Update Account Email (" + otpCode + ")");
            message.setText(
                    "Hello @" + currentUsername + ",\n\n" +
                    "A request was made to update your registered BillWise account email to this address (" + newEmail + ").\n\n" +
                    "Your 6-digit Email Verification OTP is: " + otpCode + "\n\n" +
                    "⚠️ IMPORTANT SECURITY NOTICE:\n" +
                    "Confirming this change will transfer all future GST filing alerts, verification codes, and login recovery links to this email address.\n\n" +
                    "This code will expire in " + expiryMinutes + " minutes. If you did not initiate this change, please ignore this email and your current account email will remain unchanged.\n\n" +
                    "— The BillWise Security Team"
            );

            mailSender.send(message);
            log.info("✅ [REAL EMAIL DELIVERED] Email change OTP dispatched to [{}] via Gmail SMTP", newEmail);
            return true;
        } catch (Exception e) {
            log.warn("⚠️ [EMAIL DELIVERY FAILED] Could not deliver email change OTP to {}: {}. Falling back to dev OTP code [{}]",
                    newEmail, e.getMessage(), otpCode);
            return false;
        }
    }

    public boolean sendEmailChangeOtpEmail(String newEmail, String currentUsername, String otpCode) {
        return sendEmailChangeOtpEmail(newEmail, currentUsername, otpCode, 10);
    }
}
