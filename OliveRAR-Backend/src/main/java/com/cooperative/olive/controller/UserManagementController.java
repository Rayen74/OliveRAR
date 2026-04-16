package com.cooperative.olive.controller;

import com.cooperative.olive.entity.Role;
import com.cooperative.olive.entity.User;
import com.cooperative.olive.service.ImageService;
import com.cooperative.olive.service.UserManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserManagementController {

    private final UserManagementService userManagementService;
    private final ImageService imageService;

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
                        "message", "Role invalide"
                ));
            }
        }

        Page<User> usersPage = userManagementService.getManagedUsersPage(page, size, name, filterRole);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "users", usersPage.getContent(),
                "page", usersPage.getNumber(),
                "size", usersPage.getSize(),
                "totalElements", usersPage.getTotalElements(),
                "totalPages", usersPage.getTotalPages()
        ));
    }

    /**
     * GET /api/users/by-role?role=OUVRIER&disponibilite=DISPONIBLE
     * Returns users filtered by role. If disponibilite is provided, filters further
     * (relevant for OUVRIER whose disponibilite is stored on the Ouvrier subclass).
     */
    @GetMapping("/by-role")
    public ResponseEntity<?> getUsersByRole(
            @RequestParam String role,
            @RequestParam(required = false) String disponibilite) {
        try {
            Role filterRole = Role.valueOf(role);
            java.util.List<User> users;
            if (disponibilite != null && !disponibilite.isBlank()) {
                users = userManagementService.getUsersByRoleAndDisponibilite(filterRole, disponibilite);
            } else {
                users = userManagementService.getUsersByRole(filterRole);
            }
            return ResponseEntity.ok(Map.of("success", true, "users", users));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Role invalide"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable String id) {
        try {
            User user = userManagementService.getUserById(id);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Profile loaded successfully.",
                    "data", user,
                    "user", user
            ));
        } catch (RuntimeException e) {
            return errorResponse(HttpStatus.NOT_FOUND, e.getMessage());
        }
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody User user) {
        try {
            User created = userManagementService.createUser(user);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "success", true,
                    "message", "Utilisateur cree avec succes",
                    "user", created
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable String id, @RequestBody User user) {
        try {
            User updated = userManagementService.updateUser(id, user);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Utilisateur mis a jour",
                    "user", updated
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    @PutMapping("/{id}/profile")
    public ResponseEntity<?> updateProfile(@PathVariable String id, @RequestBody User user) {
        try {
            User updated = userManagementService.updateProfile(id, user);
            return successResponse("Profile updated successfully.", updated);
        } catch (RuntimeException e) {
            return errorResponse(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @PostMapping("/{id}/upload-photo")
    public ResponseEntity<?> uploadPhoto(@PathVariable String id, @RequestParam("file") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return errorResponse(HttpStatus.BAD_REQUEST, "Image upload failed. No file was provided.");
            }
            String imageUrl = imageService.uploadImage(file);
            User updated = userManagementService.updateProfileImage(id, imageUrl);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Image uploaded successfully.",
                    "data", updated,
                    "url", imageUrl,
                    "user", updated
            ));
        } catch (Exception e) {
            return errorResponse(HttpStatus.BAD_REQUEST, "Image upload failed. " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable String id) {
        try {
            userManagementService.deleteUser(id);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Utilisateur supprime"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    private ResponseEntity<Map<String, Object>> successResponse(String message, User user) {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", message,
                "data", user,
                "user", user
        ));
    }

    private ResponseEntity<Map<String, Object>> errorResponse(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of(
                "success", false,
                "message", message
        ));
    }
}
