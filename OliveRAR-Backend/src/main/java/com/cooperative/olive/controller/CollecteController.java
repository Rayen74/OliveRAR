package com.cooperative.olive.controller;

import com.cooperative.olive.entity.Collecte;
import com.cooperative.olive.service.CollecteService;
import com.cooperative.olive.util.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

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

    // ✅ CALENDRIER FILTRÉ PAR RÔLE
    @GetMapping("/calendar")
    public ApiResponse<Object> getCalendar() {
        return ApiResponse.success(
                "Calendrier récupéré",
                collecteService.getCalendarForCurrentUser()
        );
    }

// ✅ Ce endpoint DOIT exister tel quel
    @GetMapping("/by-date")
    public ApiResponse<Object> getByDate(@RequestParam String date) {
        return ApiResponse.success(
                "Collectes du jour",
                collecteService.getByDate(date)
        );
    }
    // ✅ Nouveau endpoint pour le logisticien
    @GetMapping("/mes-collectes")
    public ApiResponse<Object> getMesCollectes(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "6") int size,
            @RequestParam(required = false) String statut
    ) {
        return ApiResponse.success(
                "Mes collectes",
                collecteService.getAllPaginated(page, size, null, statut)
        );
    }
    @GetMapping("/{id}")
    public ApiResponse<Object> getById(@PathVariable String id) {
        return ApiResponse.success("OK", collecteService.getById(id));
    }

    @PostMapping
    public ApiResponse<Collecte> create(@Valid @RequestBody Collecte collecte) {
        return ApiResponse.success("Créée", collecteService.create(collecte));
    }

    @PutMapping("/{id}")
    public ApiResponse<Collecte> update(@PathVariable String id, @RequestBody Collecte collecte) {
        return ApiResponse.success("MAJ", collecteService.update(id, collecte));
    }

    // ✅ AFFECTATION ÉQUIPE
    @PatchMapping("/{id}/equipe")
    public ApiResponse<Object> affecterEquipe(
            @PathVariable String id,
            @RequestBody Map<String, List<String>> body
    ) {
        return ApiResponse.success(
                "Equipe affectée",
                collecteService.affecterEquipe(id, body.get("equipeIds"))
        );
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable String id) {
        collecteService.delete(id);
        return ApiResponse.success("Supprimée");
    }
}