package com.cooperative.olive.controller;

import com.cooperative.olive.dao.AlertRepository;
import com.cooperative.olive.dao.CollecteRepository;
import com.cooperative.olive.dao.TourneeRepository;
import com.cooperative.olive.dao.UserRepository;
import com.cooperative.olive.dao.VergerRepository;
import com.cooperative.olive.entity.Alert;
import com.cooperative.olive.entity.Collecte;
import com.cooperative.olive.entity.Tournee;
import com.cooperative.olive.entity.Verger;
import com.cooperative.olive.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

/**
 * Endpoints dédiés à l'agent IA n8n.
 * Ces routes sont ouvertes (no auth) car appelées en interne par n8n.
 */
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiApiController {

    private final TourneeRepository tourneeRepository;
    private final VergerRepository  vergerRepository;
    private final CollecteRepository collecteRepository;
    private final AlertRepository   alertRepository;
    private final UserRepository    userRepository;

    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    @GetMapping("/planning")
    public Map<String, Object> getPlanning() {
        LocalDate today = LocalDate.now();

        List<Map<String, Object>> tournees = tourneeRepository.findAll().stream()
                .filter(t -> !"ANNULEE".equalsIgnoreCase(t.getStatus()))
                .map(t -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("nom", safe(t.getName()));
                    map.put("statut", safe(t.getStatus()));
                    map.put("debut", t.getPlannedStartTime() != null ? t.getPlannedStartTime().format(DATE_FMT) : "Non défini");
                    map.put("fin", t.getPlannedEndTime() != null ? t.getPlannedEndTime().format(DATE_FMT) : "Non défini");
                    map.put("collectes", t.getCollecteIds() != null ? t.getCollecteIds().size() : 0);
                    map.put("aujourd_hui", t.getPlannedStartTime() != null && t.getPlannedStartTime().toLocalDate().equals(today));
                    return map;
                })
                .collect(Collectors.toList());

        List<Map<String, Object>> vergers = vergerRepository.findAll().stream()
                .map(v -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("nom", safe(v.getNom()));
                    map.put("localisation", safe(v.getLocalisation()));
                    map.put("statut", safe(v.getStatut()));
                    map.put("typeOlive", safe(v.getTypeOlive()));
                    map.put("superficie", v.getSuperficie());
                    map.put("rendement", v.getRendementEstime());
                    return map;
                })
                .collect(Collectors.toList());

        long prets    = vergers.stream().filter(v -> "PRET_POUR_RECOLTE".equals(v.get("statut"))).count();
        long enCours  = tournees.stream().filter(t -> "EN_COURS".equals(t.get("statut"))).count();
        long auJourd  = tournees.stream().filter(t -> Boolean.TRUE.equals(t.get("aujourd_hui"))).count();

        Map<String, Object> result = new HashMap<>();
        result.put("date", today.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
        result.put("resume", String.format("%d tournée(s) aujourd'hui, %d en cours. %d verger(s) prêt(s) pour récolte.", auJourd, enCours, prets));
        result.put("tournees", tournees);
        result.put("vergers", vergers);
        result.put("totalTournees", tournees.size());
        result.put("totalVergers", vergers.size());
        result.put("vergersPretsRecolte", prets);
        return result;
    }

    @GetMapping("/collectes")
    public Map<String, Object> getCollectes(
            @RequestParam(required = false) String statut) {

        List<Collecte> all = collecteRepository.findAll();

        List<Map<String, Object>> collectes = all.stream()
                .filter(c -> statut == null || statut.equalsIgnoreCase(c.getStatut()))
                .map(c -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("nom", safe(c.getName()));
                    map.put("verger", resolveVergerNom(c.getVergerId()));
                    map.put("localisation", resolveVergerLocalisation(c.getVergerId()));
                    map.put("datePrevue", c.getDatePrevue() != null ? c.getDatePrevue().toString() : "Non définie");
                    map.put("statut", safe(c.getStatut()));
                    map.put("chefRecolte", resolveUserFullName(c.getChefRecolteId()));
                    map.put("tournee", resolveTourneeNameByCollecteId(c.getId()));
                    return map;
                })
                .collect(Collectors.toList());

        long planifiees = collectes.stream().filter(c -> "PLANIFIEE".equals(c.get("statut"))).count();
        long enCours    = collectes.stream().filter(c -> "EN_COURS".equals(c.get("statut"))).count();
        long terminees  = collectes.stream().filter(c -> "TERMINEE".equals(c.get("statut"))).count();

        Map<String, Object> result = new HashMap<>();
        result.put("total", collectes.size());
        result.put("planifiees", planifiees);
        result.put("enCours", enCours);
        result.put("terminees", terminees);
        result.put("collectes", collectes);
        return result;
    }

    @GetMapping("/alertes")
    public Map<String, Object> getAlertes(
            @RequestParam(required = false, defaultValue = "false") boolean toutesLesAlertes) {

        List<Alert> all = alertRepository.findAll();

        List<Map<String, Object>> alertes = all.stream()
                .filter(a -> toutesLesAlertes || !a.isLu())
                .map(a -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("type", safe(a.getType()));
                    map.put("description", safe(a.getDescription()));
                    map.put("verger", safe(a.getNomVerger()));
                    map.put("localisation", safe(a.getLocalisationVerger()));
                    map.put("agriculteur", (a.getPrenomAgriculteur() != null ? a.getPrenomAgriculteur() : "") + " " +
                                    (a.getNomAgriculteur() != null ? a.getNomAgriculteur() : ""));
                    map.put("lue", a.isLu());
                    map.put("date", a.getTimestamp() != null ? a.getTimestamp() : "Inconnue");
                    return map;
                })
                .collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("total", alertes.size());
        result.put("nonLues", alertes.stream().filter(a -> Boolean.FALSE.equals(a.get("lue"))).count());
        result.put("alertes", alertes);
        return result;
    }

    private String safe(String s) { return s != null ? s : ""; }

    private String resolveVergerNom(String vergerId) {
        if (vergerId == null) return "Non défini";
        return vergerRepository.findById(vergerId).map(Verger::getNom).orElse("Verger inconnu");
    }

    private String resolveVergerLocalisation(String vergerId) {
        if (vergerId == null) return "Non définie";
        return vergerRepository.findById(vergerId).map(Verger::getLocalisation).orElse("Localisation inconnue");
    }

    private String resolveUserFullName(String userId) {
        if (userId == null) return "Non défini";
        return userRepository.findById(userId)
                .map(u -> (u.getPrenom() != null ? u.getPrenom() : "") + " " + (u.getNom() != null ? u.getNom() : ""))
                .orElse("Utilisateur inconnu");
    }

    private String resolveTourneeNameByCollecteId(String collecteId) {
        if (collecteId == null) return "Aucune";
        return tourneeRepository.findAll().stream()
                .filter(t -> t.getCollecteIds() != null && t.getCollecteIds().contains(collecteId))
                .map(Tournee::getName)
                .findFirst()
                .orElse("Indépendante");
    }
}
