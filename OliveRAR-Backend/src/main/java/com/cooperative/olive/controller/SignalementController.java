package com.cooperative.olive.controller;

import com.cooperative.olive.entity.Signalement;
import com.cooperative.olive.service.SignalementService;
import com.cooperative.olive.util.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/signalements")
@RequiredArgsConstructor
public class SignalementController {

    private final SignalementService signalementService;

    @GetMapping("/mine")
    public ApiResponse<List<Signalement>> getMine() {
        return ApiResponse.success("Signalements récupérés avec succès.", signalementService.getMine());
    }

    @GetMapping("/verger/{vergerId}")
    public ApiResponse<List<Signalement>> getByVerger(@PathVariable String vergerId) {
        return ApiResponse.success("Signalements récupérés avec succès.", signalementService.getByVerger(vergerId));
    }

    @PostMapping
    public ApiResponse<Signalement> create(@Valid @RequestBody Signalement signalement) {
        return ApiResponse.success("Signalement créé avec succès.", signalementService.create(signalement));
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<Signalement> updateStatus(@PathVariable String id, @RequestParam String status) {
        return ApiResponse.success("Statut du signalement mis à jour.", signalementService.updateStatus(id, status));
    }
}
