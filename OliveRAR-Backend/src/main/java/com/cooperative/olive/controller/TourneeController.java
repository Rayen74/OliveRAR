package com.cooperative.olive.controller;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.cooperative.olive.entity.Affectation;
import com.cooperative.olive.entity.Tournee;
import com.cooperative.olive.util.ApiResponse;
import com.cooperative.olive.service.TourneeService;

import lombok.RequiredArgsConstructor;

/**
 * Contrôleur REST pour la gestion des tournées logistiques.
 */
@RestController
@RequestMapping("/api/tournees")
@RequiredArgsConstructor
public class TourneeController {

    private final TourneeService tourneeService;

    @GetMapping
    public Map<String, Object> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "6") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status) {
        return tourneeService.getAll(page, size, search, status);
    }

    @GetMapping("/{id}")
    public ApiResponse<Map<String, Object>> getById(@PathVariable String id) {
        return ApiResponse.success("Détails de la tournée récupérés.", tourneeService.getById(id));
    }

    @PostMapping
    public ApiResponse<Tournee> create(@RequestBody Tournee tournee) {
        return ApiResponse.success("Tournée créée avec succès.", tourneeService.create(tournee));
    }

    @PutMapping("/{id}")
    public ApiResponse<Tournee> update(@PathVariable String id, @RequestBody Tournee tournee) {
        return ApiResponse.success("Tournée mise à jour avec succès.", tourneeService.update(id, tournee));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable String id) {
        tourneeService.delete(id);
        return ApiResponse.success("Tournée supprimée avec succès.");
    }

    @PostMapping("/{id}/collects")
    public ApiResponse<Tournee> addCollecte(@PathVariable String id, @RequestBody Map<String, String> payload) {
        return ApiResponse.success("Collecte ajoutée à la tournée.",
                tourneeService.addCollecte(id, payload.get("collectId")));
    }

    @DeleteMapping("/{id}/collects/{collectId}")
    public ApiResponse<Tournee> removeCollecte(@PathVariable String id, @PathVariable String collectId) {
        return ApiResponse.success("Collecte retirée de la tournée.", tourneeService.removeCollecte(id, collectId));
    }

    @PatchMapping("/{id}/resources")
    public ApiResponse<Tournee> updateResources(@PathVariable String id, @RequestBody List<Affectation> Affectations) {
        return ApiResponse.success("Ressources mises à jour.", tourneeService.updateResources(id, Affectations));
    }

    @GetMapping("/calendar-data")
    public ApiResponse<List<Map<String, Object>>> getCalendarData() {
        return ApiResponse.success("Données du calendrier récupérées.", tourneeService.getCalendarData());
    }
}
