package com.cooperative.olive.controller;

import com.cooperative.olive.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/cooperative")
    @PreAuthorize("hasRole('RESPONSABLE_COOPERATIVE')")
    public ResponseEntity<Map<String, Object>> getCooperativeDashboardStats(@RequestParam(defaultValue = "month") String period) {
        return ResponseEntity.ok(dashboardService.getCooperativeDashboardStats(period));
    }

}
