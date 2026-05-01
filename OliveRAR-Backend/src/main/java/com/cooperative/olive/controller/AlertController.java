package com.cooperative.olive.controller;

import com.cooperative.olive.entity.Alert;
import com.cooperative.olive.service.AlertService;
import com.cooperative.olive.util.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;


@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
public class AlertController {

    private final AlertService alertService;

    @GetMapping("/role/{role}")
    public List<Alert> getByRole(@PathVariable String role) {
        return alertService.getByRole(role);
    }

    @GetMapping("/verger/{vergerId}")
    public List<Alert> getByVerger(@PathVariable String vergerId) {
        return alertService.getByVergerId(vergerId);
    }

    @PatchMapping("/{id}/lu")
    public ApiResponse<Alert> marquerLu(@PathVariable String id) {
        return ApiResponse.success("Notification marquée comme lue.", alertService.marquerLu(id));
    }
}
