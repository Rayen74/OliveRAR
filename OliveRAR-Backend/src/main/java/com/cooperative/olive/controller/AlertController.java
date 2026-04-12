package com.cooperative.olive.controller;

import com.cooperative.olive.entity.Alert;
import com.cooperative.olive.service.AlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
public class AlertController {

    private final AlertService alertService;

    @GetMapping("/role/{role}")
    public ResponseEntity<List<Alert>> getByRole(@PathVariable String role) {
        return ResponseEntity.ok(alertService.getByRole(role));
    }

    @GetMapping("/verger/{vergerId}")
    public ResponseEntity<List<Alert>> getByVerger(@PathVariable String vergerId) {
        return ResponseEntity.ok(alertService.getByVergerId(vergerId));
    }

    @PatchMapping("/{id}/lu")
    public ResponseEntity<?> marquerLu(@PathVariable String id) {
        try {
            Alert alert = alertService.marquerLu(id);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", alert,
                    "message", "Notification marquee comme lue"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage()));
        }
    }
}
