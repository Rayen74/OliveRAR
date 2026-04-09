package com.cooperative.olive.controller;

import com.cooperative.olive.entity.Role;
import com.cooperative.olive.entity.User;
import com.cooperative.olive.service.UserManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserManagementController {

    private final UserManagementService userManagementService;

    @GetMapping
    public ResponseEntity<?> getAllUsersExceptResponsableCooperative(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "7") int size,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String role) {
        Role filterRole = null;
        if (role != null && !role.isBlank()) {
            try {
                filterRole = Role.valueOf(role);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Role invalide"));
            }
        }

        Page<User> usersPage = userManagementService.getManagedUsersPage(page, size, name, filterRole);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "users", usersPage.getContent(),
                "page", usersPage.getNumber(),
                "size", usersPage.getSize(),
                "totalElements", usersPage.getTotalElements(),
                "totalPages", usersPage.getTotalPages()));
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody User user) {
        try {
            User created = userManagementService.createUser(user);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "success", true,
                    "message", "Utilisateur cree avec succes",
                    "user", created));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable String id, @RequestBody User user) {
        try {
            User updated = userManagementService.updateUser(id, user);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Utilisateur mis a jour",
                    "user", updated));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable String id) {
        try {
            userManagementService.deleteUser(id);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Utilisateur supprime"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "success", false,
                    "message", e.getMessage()));
        }
    }
}
