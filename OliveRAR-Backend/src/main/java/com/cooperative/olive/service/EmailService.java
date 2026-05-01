package com.cooperative.olive.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String fromEmail;

    @Value("${app.mail.reset.subject}")
    private String resetSubject;

    @Value("${spring.mail.password:}")
    private String emailPassword;

    public void sendPasswordResetEmail(String toEmail, String resetToken) {
        // Check if email is configured
        if (emailPassword == null || emailPassword.trim().isEmpty()) {
            // Fallback to console logging for development
            String resetLink = "http://localhost:4200/reset-password?token=" + resetToken;
            log.warn("EMAIL_PASSWORD not configured. Reset link for {}: {}", toEmail, resetLink);
            log.warn("Set EMAIL_PASSWORD environment variable to enable email sending");
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject(resetSubject);

            String resetLink = "http://localhost:4200/reset-password?token=" + resetToken;
            String emailContent = buildResetEmailContent(toEmail, resetLink);

            message.setText(emailContent);

            mailSender.send(message);
            log.info("Password reset email sent successfully to: {}", toEmail);

        } catch (Exception e) {
            log.error("Failed to send password reset email to {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Erreur lors de l'envoi de l'email de réinitialisation");
        }
    }

    private String buildResetEmailContent(String email, String resetLink) {
        return String.format(
            "Bonjour,\n\n" +
            "Vous avez demandé la réinitialisation de votre mot de passe pour votre compte CoopOléicole.\n\n" +
            "Pour réinitialiser votre mot de passe, cliquez sur le lien suivant :\n" +
            "%s\n\n" +
            "Ce lien est valide pendant 15 minutes.\n\n" +
            "Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.\n\n" +
            "Cordialement,\n" +
            "L'équipe CoopOléicole",
            resetLink
        );
    }
}