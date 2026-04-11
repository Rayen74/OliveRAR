package com.cooperative.olive.controller;

import com.cooperative.olive.entity.Alert;
import com.cooperative.olive.service.AlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
public class AlertController {

    private final AlertService alertService;

    // GET toutes les alertes par rôle
    @GetMapping("/role/{role}")
    public ResponseEntity<List<Alert>> getByRole(@PathVariable String role) {
        return ResponseEntity.ok(alertService.getByRole(role));
    }

    // GET alertes par verger
    @GetMapping("/verger/{vergerId}")
    public ResponseEntity<List<Alert>> getByVerger(@PathVariable String vergerId) {
        return ResponseEntity.ok(alertService.getByVergerId(vergerId));
    }

    // PUT marquer une alerte comme lue
    @PutMapping("/{id}/lu")
    public ResponseEntity<?> marquerLu(@PathVariable String id) {
        try {
            Alert alert = alertService.marquerLu(id);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", alert,
                    "message", "Notification marquée comme lue"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage()));
        }
    }
}