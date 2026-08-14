package com.billwise.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Service
@Slf4j
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailSenderUsername;

    /**
     * Dispatches a 3-day statutory GST filing deadline reminder email.
     */
    public boolean sendGstDeadlineReminderEmail(
            String toEmail,
            String businessName,
            String formName,
            String title,
            LocalDate dueDate,
            long daysRemaining,
            int lateFeePerDay,
            int maxPenalty,
            boolean isTest
    ) {
        String formattedDate = dueDate != null ? dueDate.format(DateTimeFormatter.ofPattern("dd MMMM yyyy")) : "Upcoming";
        String subject = (isTest ? "[TEST REMINDER] " : "[URGENT COMPLIANCE] ") + "GST Filing Deadline Alert: " + formName + " due in " + daysRemaining + " Days (" + formattedDate + ")";

        if (mailSender == null || mailSenderUsername == null || mailSenderUsername.trim().isEmpty()) {
            log.info("[EMAIL SIMULATOR / LOG ONLY] GST Deadline Reminder -> To: {}, Business: {}, Form: {}, DueDate: {}, DaysRemaining: {}, LateFee: Rs.{}/day",
                    toEmail, businessName, formName, formattedDate, daysRemaining, lateFeePerDay);
            return false;
        }

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");

            helper.setFrom(mailSenderUsername.trim());
            helper.setTo(toEmail.trim());
            helper.setSubject(subject);

            String htmlBody = "<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;\">"
                    + "<div style=\"background: linear-gradient(135deg, #e11d48, #be123c); padding: 24px; color: white;\">"
                    + "<h1 style=\"margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;\">BillWise Statutory Tax Alert</h1>"
                    + "<p style=\"margin: 6px 0 0 0; opacity: 0.9; font-size: 13px;\">GST Return Filing Due Date Notification</p>"
                    + "</div>"
                    + "<div style=\"padding: 24px; color: #1e293b; line-height: 1.6;\">"
                    + "<p style=\"margin-top: 0; font-size: 14px;\">Dear <strong>" + (businessName != null ? businessName : "Taxpayer") + "</strong>,</p>"
                    + "<p style=\"font-size: 14px;\">This is an automated statutory compliance reminder that your GST return filing is due in <strong>" + daysRemaining + " Days</strong>:</p>"
                    + "<div style=\"background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 16px; margin: 18px 0;\">"
                    + "<table style=\"width: 100%; font-size: 13px;\">"
                    + "<tr><td style=\"color: #64748b; padding: 4px 0;\">Return Form:</td><td style=\"font-weight: bold; color: #e11d48;\">" + formName + " (" + title + ")</td></tr>"
                    + "<tr><td style=\"color: #64748b; padding: 4px 0;\">Statutory Due Date:</td><td style=\"font-weight: bold; font-family: monospace; color: #0f172a;\">" + formattedDate + "</td></tr>"
                    + "<tr><td style=\"color: #64748b; padding: 4px 0;\">Time Remaining:</td><td style=\"font-weight: bold; color: #e11d48;\">" + daysRemaining + " Days</td></tr>"
                    + "<tr><td style=\"color: #64748b; padding: 4px 0;\">Statutory Late Fee:</td><td style=\"color: #475569;\">Rs. " + lateFeePerDay + "/day (Max: Rs. " + maxPenalty + ") + 18% p.a. interest</td></tr>"
                    + "</table>"
                    + "</div>"
                    + "<p style=\"font-size: 13px; color: #475569;\">Filing on time protects your enterprise from statutory late fees under Section 47 of the CGST Act, prevents E-Way Bill generation blocks, and maintains your GST compliance rating.</p>"
                    + "<div style=\"margin-top: 24px;\">"
                    + "<a href=\"http://localhost:5173\" style=\"display: inline-block; background: #e11d48; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 13px;\">Review & File in BillWise &rarr;</a>"
                    + "</div>"
                    + "<p style=\"margin-top: 28px; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 14px;\">"
                    + "You received this email because deadline reminders are enabled for your BillWise account. You can adjust your reminder preferences anytime in Settings."
                    + "</p>"
                    + "</div>"
                    + "</div>";

            helper.setText(htmlBody, true);
            mailSender.send(mimeMessage);
            log.info("[EMAIL DELIVERED] GST deadline reminder for [{}] sent to [{}] via SMTP", formName, toEmail);
            return true;
        } catch (Exception e) {
            log.warn("[EMAIL DELIVERY FAILED] Could not send GST deadline email to {}: {}", toEmail, e.getMessage());
            return false;
        }
    }

    /**
     * Sends a 6-digit verification OTP code to the recipient's email.
     */
    public boolean sendSignupOtpEmail(String toEmail, String otpCode, int expiryMinutes) {
        if (mailSender == null || mailSenderUsername == null || mailSenderUsername.trim().isEmpty()) {
            log.info("[OTP EMAIL SIMULATOR] Generated OTP [{}] for: {}", otpCode, toEmail);
            return false;
        }

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");

            helper.setFrom(mailSenderUsername.trim());
            helper.setTo(toEmail.trim());
            helper.setSubject("Your BillWise Verification Code: " + otpCode);

            String htmlBody = "<div style=\"font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background: #ffffff;\">"
                    + "<div style=\"background: linear-gradient(135deg, #e11d48, #be123c); padding: 24px 28px; color: white;\">"
                    + "<h1 style=\"margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;\">BillWise Enterprise</h1>"
                    + "<p style=\"margin: 4px 0 0 0; opacity: 0.9; font-size: 13px;\">GST & Invoice Intelligence Platform</p>"
                    + "</div>"
                    + "<div style=\"padding: 28px; color: #1e293b; line-height: 1.6;\">"
                    + "<h2 style=\"margin: 0 0 12px 0; font-size: 16px; color: #0f172a;\">Verify Your Email Address</h2>"
                    + "<p style=\"font-size: 14px; color: #475569; margin: 0 0 20px 0;\">Use the following 6-digit verification code to complete your BillWise merchant registration:</p>"
                    + "<div style=\"background: #fff1f2; border: 2px dashed #f43f5e; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0;\">"
                    + "<span style=\"font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #e11d48;\">" + otpCode + "</span>"
                    + "</div>"
                    + "<p style=\"font-size: 12px; color: #64748b; margin: 16px 0 0 0;\">⏱️ This code will expire in <strong>" + expiryMinutes + " minutes</strong>. Please do not share this code with anyone.</p>"
                    + "<p style=\"font-size: 12px; color: #94a3b8; margin: 24px 0 0 0; border-top: 1px solid #f1f5f9; padding-top: 16px;\">"
                    + "If you did not initiate this merchant signup, you can safely ignore this message."
                    + "</p>"
                    + "</div>"
                    + "</div>";

            helper.setText(htmlBody, true);
            mailSender.send(mimeMessage);
            log.info("[EMAIL DELIVERED] Verification OTP [{}] successfully dispatched to [{}] via SMTP", otpCode, toEmail);
            return true;
        } catch (Exception e) {
            log.error("[EMAIL DELIVERY FAILED] Could not deliver OTP email to {}: {}", toEmail, e.getMessage(), e);
            return false;
        }
    }

    /**
     * Sends a 6-digit password reset OTP code to the user's email.
     */
    public boolean sendPasswordResetOtpEmail(String toEmail, String otpCode, int expiryMinutes) {
        if (mailSender == null || mailSenderUsername == null || mailSenderUsername.trim().isEmpty()) {
            log.info("[PASSWORD RESET SIMULATOR] Generated OTP [{}] for: {}", otpCode, toEmail);
            return false;
        }

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");

            helper.setFrom(mailSenderUsername.trim());
            helper.setTo(toEmail.trim());
            helper.setSubject("Your BillWise Password Reset Code: " + otpCode);

            String htmlBody = "<div style=\"font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background: #ffffff;\">"
                    + "<div style=\"background: linear-gradient(135deg, #e11d48, #be123c); padding: 24px 28px; color: white;\">"
                    + "<h1 style=\"margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;\">BillWise Security</h1>"
                    + "<p style=\"margin: 4px 0 0 0; opacity: 0.9; font-size: 13px;\">Account Password Recovery</p>"
                    + "</div>"
                    + "<div style=\"padding: 28px; color: #1e293b; line-height: 1.6;\">"
                    + "<h2 style=\"margin: 0 0 12px 0; font-size: 16px; color: #0f172a;\">Reset Your Password</h2>"
                    + "<p style=\"font-size: 14px; color: #475569; margin: 0 0 20px 0;\">We received a request to reset your BillWise account password. Enter this 6-digit verification code to proceed:</p>"
                    + "<div style=\"background: #fff1f2; border: 2px dashed #f43f5e; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0;\">"
                    + "<span style=\"font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #e11d48;\">" + otpCode + "</span>"
                    + "</div>"
                    + "<p style=\"font-size: 12px; color: #64748b; margin: 16px 0 0 0;\">⏱️ This code will expire in <strong>" + expiryMinutes + " minutes</strong>.</p>"
                    + "<p style=\"font-size: 12px; color: #94a3b8; margin: 24px 0 0 0; border-top: 1px solid #f1f5f9; padding-top: 16px;\">"
                    + "If you did not request a password reset, please change your credentials immediately or contact support."
                    + "</p>"
                    + "</div>"
                    + "</div>";

            helper.setText(htmlBody, true);
            mailSender.send(mimeMessage);
            log.info("[EMAIL DELIVERED] Password reset OTP [{}] successfully dispatched to [{}] via SMTP", otpCode, toEmail);
            return true;
        } catch (Exception e) {
            log.error("[EMAIL DELIVERY FAILED] Could not deliver password reset email to {}: {}", toEmail, e.getMessage(), e);
            return false;
        }
    }
}
