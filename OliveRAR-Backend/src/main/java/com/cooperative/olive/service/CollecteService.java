package com.cooperative.olive.service;

import com.cooperative.olive.controller.PaginatedResponse;
import com.cooperative.olive.dao.CollecteRepository;
import com.cooperative.olive.dao.UserRepository;
import com.cooperative.olive.dao.VergerRepository;
import com.cooperative.olive.entity.Collecte;
import com.cooperative.olive.entity.Role;
import com.cooperative.olive.entity.User;
import com.cooperative.olive.entity.Verger;
import com.cooperative.olive.exception.BusinessException;
import com.cooperative.olive.exception.ResourceNotFoundException;
import com.cooperative.olive.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.stream.Collectors;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CollecteService {

    private static final Set<String> ALLOWED_STATUTS = Set.of("PLANIFIEE", "EN_COURS", "TERMINEE", "ANNULEE");

    private final CollecteRepository collecteRepository;
    private final UserRepository userRepository;
    private final VergerRepository vergerRepository;
    private final MongoTemplate mongoTemplate;
    private final CurrentUserService currentUserService;

    public PaginatedResponse<Map<String, Object>> getAllPaginated(
            int page, int size, String chefRecolteId, String statut) {

        currentUserService.requireRole(Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE, Role.RESPONSABLE_CHEF_RECOLTE);

        User current = currentUserService.getRequiredCurrentUser();
        int safePage = Math.max(page, 0);
        int safeSize = size <= 0 ? 6 : Math.min(size, 50);

        Query query = new Query();

        if (current.getRole() == Role.RESPONSABLE_LOGISTIQUE) {
            query.addCriteria(Criteria.where("responsableAffectationId").is(current.getId()));
        }

        if (chefRecolteId != null && !chefRecolteId.isBlank()) {
            query.addCriteria(Criteria.where("chefRecolteId").is(chefRecolteId));
        }
        if (statut != null && !statut.isBlank()) {
            query.addCriteria(Criteria.where("statut").is(statut));
        }

        long totalElements = mongoTemplate.count(query, Collecte.class);
        int totalPages = (int) Math.ceil((double) totalElements / safeSize);
        if (totalPages == 0) totalPages = 1;

        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "datePrevue"));
        query.with(pageable);

        List<Collecte> collectes = mongoTemplate.find(query, Collecte.class);
        List<Map<String, Object>> enriched = collectes.stream()
                .map(this::enrichCollecte)
                .collect(Collectors.toList());

        return new PaginatedResponse<>(enriched, totalElements, totalPages, safePage + 1, safeSize);
    }

    public Map<String, Object> getById(String id) {
        currentUserService.requireRole(Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE, Role.RESPONSABLE_CHEF_RECOLTE);
        Collecte collecte = collecteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Collecte introuvable."));
        return enrichCollecte(collecte);
    }

    public List<Map<String, Object>> getByDate(String date) {
        User current = currentUserService.getRequiredCurrentUser();
        LocalDate targetDate = LocalDate.parse(date);

        return collecteRepository.findAll().stream()
                .filter(c -> c.getDatePrevue() != null)
                .filter(c -> c.getDatePrevue().equals(targetDate))
                .filter(c -> "PLANIFIEE".equals(c.getStatut()))
                .filter(c -> current.getRole() != Role.RESPONSABLE_LOGISTIQUE
                        || current.getId().equals(c.getResponsableAffectationId()))
                .map(this::enrichCollecte)
                .toList();
    }

    public List<Map<String, Object>> getAllForCalendar() {
        currentUserService.requireRole(Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE, Role.RESPONSABLE_CHEF_RECOLTE);
        return collecteRepository.findAll().stream().map(c -> {
            Map<String, Object> item = new HashMap<>();
            item.put("id", c.getId());
            item.put("datePrevue", c.getDatePrevue() != null ? c.getDatePrevue().toString() : null);
            item.put("statut", c.getStatut());
            item.put("vergerNom", resolveVergerNom(c.getVergerId()));
            item.put("chefRecolteNom", resolveUserFullName(c.getChefRecolteId()));
            item.put("equipeSize", c.getEquipeIds() != null ? c.getEquipeIds().size() : 0);
            return item;
        }).collect(Collectors.toList());
    }
    public Collecte affecterEquipe(String id, List<String> equipeIds) {
        currentUserService.requireRole(Role.RESPONSABLE_LOGISTIQUE);
        Collecte c = collecteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Collecte introuvable"));

        User current = currentUserService.getRequiredCurrentUser();
        if (!current.getId().equals(c.getResponsableAffectationId())) {
            throw new BusinessException("Non autorisé");
        }

        c.setEquipeIds(equipeIds);
        c.setUpdatedAt(LocalDateTime.now());
        return collecteRepository.save(c);
    }

    public Collecte create(Collecte collecte) {
        currentUserService.requireRole(Role.RESPONSABLE_COOPERATIVE);
        collecte.setEquipeIds(new ArrayList<>());
        collecte.setStatut("PLANIFIEE");

        if (collecte.getVergerId() != null && !collecte.getVergerId().isBlank()
                && collecteRepository.existsByVergerId(collecte.getVergerId())) {
            throw new BusinessException("Une collecte existe déjà pour ce verger.");
        }

        validateCollecte(collecte);
        collecte.setId(null);
        collecte.setCreatedBy(currentUserService.getRequiredCurrentUser().getId());
        collecte.setCreatedAt(LocalDateTime.now());
        collecte.setUpdatedAt(LocalDateTime.now());
        return collecteRepository.save(collecte);
    }

    public Collecte update(String id, Collecte updated) {
        currentUserService.requireRole(Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE);
        Collecte existing = collecteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Collecte introuvable."));

        if (updated.getVergerId() != null && !updated.getVergerId().isBlank()
                && collecteRepository.existsByVergerIdAndIdNot(updated.getVergerId(), id)) {
            throw new BusinessException("Une collecte existe déjà pour ce verger.");
        }

        validateCollecte(updated);
        existing.setVergerId(updated.getVergerId());
        existing.setDatePrevue(updated.getDatePrevue());
        existing.setResponsableAffectationId(updated.getResponsableAffectationId());
        existing.setChefRecolteId(updated.getChefRecolteId());
        existing.setEquipeIds(updated.getEquipeIds() != null ? updated.getEquipeIds() : new ArrayList<>());
        existing.setStatut(updated.getStatut());
        existing.setUpdatedAt(LocalDateTime.now());
        return collecteRepository.save(existing);
    }

    public void delete(String id) {
        currentUserService.requireRole(Role.RESPONSABLE_COOPERATIVE);
        if (!collecteRepository.existsById(id)) {
            throw new ResourceNotFoundException("Collecte introuvable.");
        }
        collecteRepository.deleteById(id);
    }

    private void validateCollecte(Collecte collecte) {
        if (collecte.getVergerId() == null || collecte.getVergerId().isBlank()) throw new BusinessException("Le verger est obligatoire.");
        if (collecte.getDatePrevue() == null) throw new BusinessException("La date prévue est obligatoire.");
        if (collecte.getChefRecolteId() == null || collecte.getChefRecolteId().isBlank()) throw new BusinessException("Le chef de récolte est obligatoire.");

        Verger verger = vergerRepository.findById(collecte.getVergerId()).orElseThrow(() -> new ResourceNotFoundException("Verger introuvable."));
        if (!"PRET_POUR_RECOLTE".equals(verger.getStatut())) throw new BusinessException("Le verger doit être PRET_POUR_RECOLTE.");
    }
    public List<Map<String, Object>> getCalendarForCurrentUser() {
        User current = currentUserService.getRequiredCurrentUser();

        List<Collecte> collectes;

        if (current.getRole() == Role.RESPONSABLE_LOGISTIQUE) {
            collectes = collecteRepository.findByResponsableAffectationId(current.getId());
        } else if (current.getRole() == Role.RESPONSABLE_COOPERATIVE
                || current.getRole() == Role.RESPONSABLE_CHEF_RECOLTE) {
            collectes = collecteRepository.findAll();
        } else {
            collectes = List.of();
        }

        return collectes.stream().map(c -> {
            Map<String, Object> item = new HashMap<>();
            item.put("id", c.getId());
            item.put("datePrevue", c.getDatePrevue() != null ? c.getDatePrevue().toString() : null);
            item.put("statut", c.getStatut());
            item.put("chefRecolteNom", resolveUserFullName(c.getChefRecolteId()));
            item.put("equipeSize", c.getEquipeIds() != null ? c.getEquipeIds().size() : 0);

            // ✅ CORRECTION : lookup complet du verger pour avoir la localisation
            String vId = c.getVergerId();
            if (vId != null && !vId.isBlank()) {
                vergerRepository.findById(vId).ifPresentOrElse(v -> {
                    item.put("vergerNom", v.getNom());
                    item.put("vergerLocalisation", v.getLocalisation());
                    item.put("vergerLat", v.getLatitude());   // 👈
                    item.put("vergerLng", v.getLongitude());  // 👈
                }, () -> {
                    item.put("vergerNom", "Inconnu");
                    item.put("vergerLocalisation", "");
                    item.put("vergerLat", null);
                    item.put("vergerLng", null);
                });
            }

            return item;
        }).collect(Collectors.toList());
    }
    private Map<String, Object> enrichCollecte(Collecte collecte) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", collecte.getId());
        map.put("vergerId", collecte.getVergerId());
        map.put("datePrevue", collecte.getDatePrevue() != null ? collecte.getDatePrevue().toString() : null);
        map.put("statut", collecte.getStatut());
        map.put("equipeIds", collecte.getEquipeIds()); // 🔥 Important pour la page équipe
        map.put("chefRecolteId", collecte.getChefRecolteId());
        map.put("responsableAffectationId", collecte.getResponsableAffectationId());

        // Détails Verger
        vergerRepository.findById(collecte.getVergerId()).ifPresent(v -> {
            map.put("vergerNom", v.getNom());
            map.put("vergerLocalisation", v.getLocalisation());
            map.put("vergerRendementEstime", v.getRendementEstime());
            map.put("vergerSuperficie", v.getSuperficie()); // 🔥 Ajouté pour le modal
            map.put("vergerStatut", v.getStatut());
        });

        // Noms des utilisateurs
        map.put("chefRecolteNom", resolveUserFullName(collecte.getChefRecolteId()));
        map.put("responsableAffectationNom", resolveUserFullName(collecte.getResponsableAffectationId()));

        // Liste Équipe enrichie (pour l'affichage)
        List<Map<String, String>> equipe = new ArrayList<>();
        if (collecte.getEquipeIds() != null) {
            for (String uid : collecte.getEquipeIds()) {
                userRepository.findById(uid).ifPresent(u -> {
                    Map<String, String> m = new HashMap<>();
                    m.put("id", u.getId());
                    m.put("nom", u.getPrenom() + " " + u.getNom());
                    equipe.add(m);
                });
            }
        }
        map.put("equipe", equipe);

        return map;
    }

    private String resolveUserFullName(String userId) {
        if (userId == null || userId.isBlank()) return "";
        return userRepository.findById(userId).map(u -> u.getPrenom() + " " + u.getNom()).orElse("");
    }

    private String resolveVergerNom(String vergerId) {
        if (vergerId == null || vergerId.isBlank()) return "";
        return vergerRepository.findById(vergerId).map(Verger::getNom).orElse("");
    }
}