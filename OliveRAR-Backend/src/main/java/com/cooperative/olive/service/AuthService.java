package com.cooperative.olive.service;

import com.cooperative.olive.dao.UserRepository;
import com.cooperative.olive.entity.User;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.config.ConfigurableBeanFactory;
import org.springframework.context.annotation.Scope;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.UUID;

@Service
@Scope(ConfigurableBeanFactory.SCOPE_SINGLETON)
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    private final SecretKey jwtKey = Keys.secretKeyFor(SignatureAlgorithm.HS512);

    public User login(User loginUser) {
        log.info("Login attempt for email: {}", loginUser.getEmail());

        User user = userRepository.findByEmail(loginUser.getEmail());

        if (user == null) {
            log.warn("Login failed: User not found - {}", loginUser.getEmail());
            throw new RuntimeException("L'utilisateur n'existe pas");
        }

        if (passwordEncoder.matches(loginUser.getPassword(), user.getPassword())) {
            log.info("Successful login for email: {}", loginUser.getEmail());
            return user;
        }

        log.warn("Login failed: Incorrect password - {}", loginUser.getEmail());
        throw new RuntimeException("Mot de passe incorrect");
    }

    public String generateToken(User user) {
        long now = System.currentTimeMillis();
        String token = Jwts.builder()
                .setSubject(user.getEmail())
                .claim("role", user.getRole().name())
                .setIssuedAt(new Date(now))
                .setExpiration(new Date(now + 86400000))
                .signWith(jwtKey)
                .compact();

        log.info("JWT Generated for user {}: {}", user.getEmail(), token);
        return token;
    }

    public void createPasswordResetToken(String email) {
        User user = userRepository.findByEmail(email);
        if (user == null) {
            throw new RuntimeException("Aucun utilisateur avec cet email");
        }

        String token = UUID.randomUUID().toString();
        user.setResetToken(token);
        user.setResetTokenExpiry(Instant.now().plus(15, ChronoUnit.MINUTES));
        userRepository.save(user);
        emailService.sendPasswordResetEmail(email, token);

        log.info("Password reset token generated and email sent for user: {}", email);
    }

    public boolean isPasswordResetTokenValid(String token) {
        User user = userRepository.findByResetToken(token);
        if (user == null || user.getResetTokenExpiry() == null) {
            return false;
        }

        if (user.getResetTokenExpiry().isBefore(Instant.now())) {
            user.setResetToken(null);
            user.setResetTokenExpiry(null);
            userRepository.save(user);
            return false;
        }

        return true;
    }

    public void resetPassword(String token, String newPassword) {
        User user = userRepository.findByResetToken(token);
        if (user == null || user.getResetTokenExpiry() == null || user.getResetTokenExpiry().isBefore(Instant.now())) {
            throw new RuntimeException("Token invalide ou expire");
        }

        validatePassword(newPassword);
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);

        log.info("Password reset successful for user: {}", user.getEmail());
    }

    public User register(User user) {
        log.info("Registration attempt for email: {}", user.getEmail());

        validatePassword(user.getPassword());
        validatePhoneNumber(user.getPhoneNumber());

        if (userRepository.findByEmail(user.getEmail()) != null) {
            log.warn("Registration failed: User already exists - {}", user.getEmail());
            throw new RuntimeException("L'utilisateur existe deja avec cet email");
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));

        User savedUser = userRepository.save(user);
        log.info("Successful registration for user: {}", user.getEmail());

        return savedUser;
    }

    private void validatePassword(String password) {
        if (password == null || password.length() < 8) {
            throw new RuntimeException("Le mot de passe doit contenir au moins 8 caracteres");
        }

        if (!password.matches(".*[0-9].*")) {
            throw new RuntimeException("Le mot de passe doit contenir au moins un chiffre");
        }

        if (!password.matches(".*[A-Z].*")) {
            throw new RuntimeException("Le mot de passe doit contenir au moins une lettre majuscule");
        }

        if (!password.matches(".*[a-z].*")) {
            throw new RuntimeException("Le mot de passe doit contenir au moins une lettre minuscule");
        }

        if (!password.matches(".*[@#$%^&+=!*?].*")) {
            throw new RuntimeException("Le mot de passe doit contenir au moins un caractere special (@#$%^&+=!*?)");
        }
    }

    private void validatePhoneNumber(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.isBlank()) {
            throw new RuntimeException("Le numero de telephone est obligatoire.");
        }

        if (!phoneNumber.matches("\\d{8}")) {
            throw new RuntimeException("Le numero de telephone doit contenir exactement 8 chiffres.");
        }
    }
}
