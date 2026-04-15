package com.cooperative.olive.controller;

import com.cooperative.olive.entity.User;
import com.cooperative.olive.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User loginUser) {
        try {
            User user = authService.login(loginUser);
            String token = authService.generateToken(user);
            
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "token", token,
                    "user", user
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        try {
            User registeredUser = authService.register(user);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "success", true,
                    "message", "Compte créé avec succès",
                    "user", registeredUser
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage(), "success", false));
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        try {
            authService.createPasswordResetToken(request.get("email"));
            return ResponseEntity.ok(Map.of("message", "Si cet email existe, un lien a été envoyé."));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/validate-reset-token")
    public ResponseEntity<?> validateResetToken(@RequestParam("token") String token) {
        try {
            boolean valid = authService.isPasswordResetTokenValid(token);
            if (valid) {
                return ResponseEntity.ok(Map.of("valid", true));
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("valid", false, "message", "Le lien de réinitialisation est invalide ou a expiré."));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage(), "valid", false));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        try {
            authService.resetPassword(request.get("token"), request.get("password"));
            return ResponseEntity.ok(Map.of("message", "Mot de passe réinitialisé avec succès"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }
}
