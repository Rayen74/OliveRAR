package com.cooperative.olive.controller;

import com.cooperative.olive.entity.Collecte;
import com.cooperative.olive.service.CollecteService;
import com.cooperative.olive.util.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/collectes")
@RequiredArgsConstructor
public class CollecteController {

    private final CollecteService collecteService;

    @GetMapping
    public PaginatedResponse<Map<String, Object>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size,
            @RequestParam(required = false) String chefRecolteId,
            @RequestParam(required = false) String statut
    ) {
        return collecteService.getAllPaginated(page, size, chefRecolteId, statut);
    }

    @GetMapping("/calendar")
    public ApiResponse<List<Map<String, Object>>> getCalendar() {
        return ApiResponse.success("Calendrier des collectes récupéré avec succès.", collecteService.getAllForCalendar());
    }

    @GetMapping("/{id}")
    public ApiResponse<Map<String, Object>> getById(@PathVariable String id) {
        return ApiResponse.success("Collecte récupérée avec succès.", collecteService.getById(id));
    }

    @PostMapping
    public ApiResponse<Collecte> create(@Valid @RequestBody Collecte collecte) {
        return ApiResponse.success("Collecte créée avec succès.", collecteService.create(collecte));
    }

    @PutMapping("/{id}")
    public ApiResponse<Collecte> update(@PathVariable String id, @Valid @RequestBody Collecte collecte) {
        return ApiResponse.success("Collecte mise à jour avec succès.", collecteService.update(id, collecte));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable String id) {
        collecteService.delete(id);
        return ApiResponse.success("Collecte supprimée avec succès.");
    }
}
