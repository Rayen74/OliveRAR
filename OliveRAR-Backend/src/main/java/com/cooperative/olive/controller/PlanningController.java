package com.cooperative.olive.controller;

import com.cooperative.olive.dao.TourneeRepository;
import com.cooperative.olive.dao.VergerRepository;
import com.cooperative.olive.entity.Tournee;
import com.cooperative.olive.entity.Verger;
import com.cooperative.olive.security.CurrentUserService;
import com.cooperative.olive.service.PlanningService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * API dédiée à l'agent IA n8n — renvoie des données lisibles et structurées
 * pour le planning des tournées et l'état des vergers.
 */
@RestController
@RequestMapping("/api/planning")
@RequiredArgsConstructor
public class PlanningController {

    private final TourneeRepository tourneeRepository;
    private final VergerRepository vergerRepository;
    private final CurrentUserService currentUserService;
    private final PlanningService planningService;

    // ─── Tournées ────────────────────────────────────────────────────────────

    /** Toutes les tournées non annulées, triées par date de début. */
    @GetMapping("/tournees")
    public List<Map<String, Object>> getTournees(
            @RequestParam(required = false, defaultValue = "false") boolean all) {

        currentUserService.getRequiredCurrentUser(); // require auth

        List<Tournee> tournees = tourneeRepository.findAll();
        return tournees.stream()
                .filter(t -> all || !("ANNULEE".equalsIgnoreCase(t.getStatus()) || "TERMINEE".equalsIgnoreCase(t.getStatus())))
                .map(planningService::toTourneeSummary)
                .collect(Collectors.toList());
    }

    /** Tournées planifiées pour aujourd'hui (par plannedStartTime). */
    @GetMapping("/tournees/today")
    public Map<String, Object> getTourneesToday() {
        currentUserService.getRequiredCurrentUser();

        LocalDate today = LocalDate.now();
        List<Map<String, Object>> todayTournees = tourneeRepository.findAll().stream()
                .filter(t -> t.getPlannedStartTime() != null &&
                             t.getPlannedStartTime().toLocalDate().equals(today))
                .map(planningService::toTourneeSummary)
                .collect(Collectors.toList());

        return Map.of(
                "date", today.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")),
                "total", todayTournees.size(),
                "tournees", todayTournees
        );
    }

    /** Tournée par ID. */
    @GetMapping("/tournees/{id}")
    public Map<String, Object> getTourneeById(@PathVariable String id) {
        currentUserService.getRequiredCurrentUser();
        Tournee t = tourneeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tournée introuvable : " + id));
        return planningService.toTourneeSummary(t);
    }

    // ─── Vergers ─────────────────────────────────────────────────────────────

    /** Tous les vergers avec leur statut. */
    @GetMapping("/vergers")
    public List<Map<String, Object>> getVergers() {
        currentUserService.getRequiredCurrentUser();
        return vergerRepository.findAll().stream()
                .map(planningService::toVergerSummary)
                .collect(Collectors.toList());
    }

    /** Vergers prêts pour la récolte (statut PRET_POUR_RECOLTE). */
    @GetMapping("/vergers/prets")
    public Map<String, Object> getVergersPrets() {
        currentUserService.getRequiredCurrentUser();
        List<Map<String, Object>> prets = vergerRepository.findAll().stream()
                .filter(v -> "PRET_POUR_RECOLTE".equalsIgnoreCase(v.getStatut()))
                .map(planningService::toVergerSummary)
                .collect(Collectors.toList());

        return Map.of(
                "total", prets.size(),
                "vergers", prets
        );
    }

    // ─── Résumé global ───────────────────────────────────────────────────────

    /**
     * Résumé global conçu pour être injecté dans le contexte de l'IA.
     * Retourne un texte structuré + données JSON.
     */
    @GetMapping("/resume")
    public Map<String, Object> getResume() {
        currentUserService.getRequiredCurrentUser();
        return planningService.getGlobalResume();
    }
}
