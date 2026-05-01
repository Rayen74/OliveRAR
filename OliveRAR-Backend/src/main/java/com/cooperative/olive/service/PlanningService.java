package com.cooperative.olive.service;

import com.cooperative.olive.dao.TourneeRepository;
import com.cooperative.olive.dao.VergerRepository;
import com.cooperative.olive.entity.Tournee;
import com.cooperative.olive.entity.Verger;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PlanningService {

    private final TourneeRepository tourneeRepository;
    private final VergerRepository vergerRepository;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    public Map<String, Object> getGlobalResume() {
        List<Tournee> allTournees = tourneeRepository.findAll();
        List<Verger> allVergers = vergerRepository.findAll();
        LocalDate today = LocalDate.now();

        long planifiees = allTournees.stream().filter(t -> "PLANIFIEE".equalsIgnoreCase(t.getStatus())).count();
        long enCours = allTournees.stream().filter(t -> "EN_COURS".equalsIgnoreCase(t.getStatus())).count();
        long terminees = allTournees.stream().filter(t -> "TERMINEE".equalsIgnoreCase(t.getStatus())).count();
        long prets = allVergers.stream().filter(v -> "PRET_POUR_RECOLTE".equalsIgnoreCase(v.getStatut())).count();
        long enCroissance = allVergers.stream().filter(v -> "EN_CROISSANCE".equalsIgnoreCase(v.getStatut())).count();

        List<Map<String, Object>> todayTournees = allTournees.stream()
                .filter(t -> t.getPlannedStartTime() != null &&
                        t.getPlannedStartTime().toLocalDate().equals(today))
                .map(this::toTourneeSummary)
                .collect(Collectors.toList());

        String textSummary = String.format(
                "📅 Planning du %s — %d tournée(s) aujourd'hui. " +
                "Total tournées : %d planifiées, %d en cours, %d terminées. " +
                "Vergers : %d prêts pour récolte, %d en croissance.",
                today.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")),
                todayTournees.size(), planifiees, enCours, terminees, prets, enCroissance
        );

        return Map.of(
                "summary", textSummary,
                "date", today.toString(),
                "tournees", Map.of(
                        "planifiees", planifiees,
                        "enCours", enCours,
                        "terminees", terminees,
                        "aujourd_hui", todayTournees
                ),
                "vergers", Map.of(
                        "total", allVergers.size(),
                        "prets", prets,
                        "enCroissance", enCroissance
                )
        );
    }

    public Map<String, Object> toTourneeSummary(Tournee t) {
        return Map.of(
                "id", t.getId() != null ? t.getId() : "",
                "nom", t.getName() != null ? t.getName() : "",
                "statut", t.getStatus() != null ? t.getStatus() : "",
                "debut", t.getPlannedStartTime() != null ? t.getPlannedStartTime().format(DATE_FMT) : "Non défini",
                "fin", t.getPlannedEndTime() != null ? t.getPlannedEndTime().format(DATE_FMT) : "Non défini",
                "nbCollectes", t.getCollecteIds() != null ? t.getCollecteIds().size() : 0,
                "nbAffectations", t.getAffectations() != null ? t.getAffectations().size() : 0,
                "optimisation", Boolean.TRUE.equals(t.getOptimizationEnabled())
        );
    }

    public Map<String, Object> toVergerSummary(Verger v) {
        return Map.of(
                "id", v.getId() != null ? v.getId() : "",
                "nom", v.getNom() != null ? v.getNom() : "",
                "localisation", v.getLocalisation() != null ? v.getLocalisation() : "",
                "statut", v.getStatut() != null ? v.getStatut() : "",
                "typeOlive", v.getTypeOlive() != null ? v.getTypeOlive() : "",
                "superficie", v.getSuperficie(),
                "nombreArbres", v.getNombreArbres(),
                "rendementEstime", v.getRendementEstime()
        );
    }
}
