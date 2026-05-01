package com.cooperative.olive.service;

import com.cooperative.olive.entity.*;
import com.cooperative.olive.exception.BusinessException;
import com.cooperative.olive.exception.ResourceNotFoundException;
import com.cooperative.olive.repository.RecolteRepository;
import com.cooperative.olive.dao.TourneeRepository;
import com.cooperative.olive.security.CurrentUserService;
import com.github.jknack.handlebars.Handlebars;
import com.github.jknack.handlebars.Template;
import com.github.jknack.handlebars.io.ClassPathTemplateLoader;
import com.github.jknack.handlebars.io.TemplateLoader;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecolteService {

    private final RecolteRepository recolteRepository;
    private final TourneeService tourneeService;
    private final TourneeRepository tourneeRepository;
    private final CollecteService collecteService;
    private final VergerService vergerService;
    private final CurrentUserService currentUserService;

    public Recolte save(Recolte recolte) {
        // Validation RBAC: Only Chef de Recolte can save
        User currentUser = currentUserService.getRequiredCurrentUser();
        if (currentUser.getRole() != Role.RESPONSABLE_CHEF_RECOLTE) {
            throw new BusinessException("Seul un chef de récolte peut enregistrer une récolte.");
        }

        // Check if tour exists
        tourneeRepository.findById(recolte.getTourId())
                .orElseThrow(() -> new ResourceNotFoundException("Tournée introuvable."));
        
        // Calculate global statuses for resource checks
        if (recolte.getResourceChecks() != null) {
            recolte.getResourceChecks().forEach(Recolte.ResourceCheck::calculerStatut);
        }

        recolte.setChefId(currentUser.getId());
        recolte.setDateEnregistrement(LocalDateTime.now());
        
        return recolteRepository.save(recolte);
    }

    public Recolte getByTourId(String tourId) {
        return recolteRepository.findByTourId(tourId)
                .orElseThrow(() -> new ResourceNotFoundException("Récolte non trouvée pour cette tournée."));
    }

    public java.util.Optional<Recolte> findOptionalByTourId(String tourId) {
        return recolteRepository.findByTourId(tourId);
    }

    public String generateReportHtml(String tourId) throws IOException {
        Map<String, Object> tour = tourneeService.getById(tourId);
        Recolte recolte = getByTourId(tourId);
        User chef = currentUserService.getRequiredCurrentUser();

        // Prepare data for Handlebars
        Map<String, Object> context = new HashMap<>();
        context.put("tourCode", tour.get("name"));
        context.put("date", tour.get("datePrevue")); // tour.get("datePrevue") is already a string from enrichTournee
        context.put("chefNom", chef.getPrenom() + " " + chef.getNom());
        
        Map<String, Object> production = new HashMap<>();
        production.put("quantite", recolte.getQuantiteOliveKg());
        production.put("unite", "kg");
        context.put("production", production);

        context.put("presences", recolte.getAttendance().stream().map(a -> {
            Map<String, Object> map = new HashMap<>();
            map.put("nom", a.getWorkerName());
            map.put("statut", a.getStatut().name());
            map.put("heure", a.getHeurePointage() != null ? a.getHeurePointage().format(DateTimeFormatter.ofPattern("HH:mm")) : "-");
            return map;
        }).collect(Collectors.toList()));

        context.put("materiel", recolte.getResourceChecks().stream().map(r -> {
            Map<String, Object> map = new HashMap<>();
            map.put("nom", r.getLabel());
            map.put("etat", r.getStatutGlobal().name());
            map.put("note", r.getNoteIncident());
            return map;
        }).collect(Collectors.toList()));

        context.put("notes", recolte.getNotesGlobales());

        // Handlebars compilation
        TemplateLoader loader = new ClassPathTemplateLoader("/templates", ".hbs");
        Handlebars handlebars = new Handlebars(loader);
        Template template = handlebars.compile("report");

        return template.apply(context);
    }
}
