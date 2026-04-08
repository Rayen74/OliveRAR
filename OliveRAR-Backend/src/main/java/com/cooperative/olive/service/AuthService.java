package com.cooperative.olive.service;

import com.cooperative.olive.dao.UserRepository;
import com.cooperative.olive.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.config.ConfigurableBeanFactory;
import org.springframework.context.annotation.Scope;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@Scope(ConfigurableBeanFactory.SCOPE_SINGLETON)
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

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
        } else {
            log.warn("Login failed: Incorrect password - {}", loginUser.getEmail());
            throw new RuntimeException("Mot de passe incorrect");
        }
    }

    public User register(User user) {
        log.info("Registration attempt for email: {}", user.getEmail());
        
        validatePassword(user.getPassword());
        
        if (userRepository.findByEmail(user.getEmail()) != null) {
            log.warn("Registration failed: User already exists - {}", user.getEmail());
            throw new RuntimeException("L'utilisateur existe déjà avec cet email");
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        
        User savedUser = userRepository.save(user);
        log.info("Successful registration for user: {}", user.getEmail());
        
        return savedUser;
    }

    private void validatePassword(String password) {
        if (password == null || password.length() < 8) {
            throw new RuntimeException("Le mot de passe doit contenir au moins 8 caractères");
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
            throw new RuntimeException("Le mot de passe doit contenir au moins un caractère spécial (@#$%^&+=!*?)");
        }
    }
}
