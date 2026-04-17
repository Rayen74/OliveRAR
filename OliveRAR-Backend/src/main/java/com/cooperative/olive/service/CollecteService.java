package com.cooperative.olive.service;

import com.cooperative.olive.controller.PaginatedResponse;
import com.cooperative.olive.dao.CollecteRepository;
import com.cooperative.olive.dao.UserRepository;
import com.cooperative.olive.dao.VergerRepository;
import com.cooperative.olive.entity.Collecte;
import com.cooperative.olive.entity.Role;
import com.cooperative.olive.entity.User;
import com.cooperative.olive.entity.Verger;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CollecteService {

    private final CollecteRepository collecteRepository;
    private final UserRepository userRepository;
    private final VergerRepository vergerRepository;
    private final MongoTemplate mongoTemplate;

    // ------------------------------------------------------------------ //
    // READ
    // ------------------------------------------------------------------ //

    public PaginatedResponse<Map<String, Object>> getAllPaginated(int page, int size, String chefRecolteId,
            String statut) {
        int safePage = Math.max(page, 0);
        int safeSize = size <= 0 ? 5 : Math.min(size, 50);

        // Build dynamic query
        Query query = new Query();
        if (chefRecolteId != null && !chefRecolteId.isBlank()) {
            query.addCriteria(Criteria.where("chefRecolteId").is(chefRecolteId));
        }
        if (statut != null && !statut.isBlank()) {
            query.addCriteria(Criteria.where("statut").is(statut));
        }

        // Count total before pagination
        long totalElements = mongoTemplate.count(query, Collecte.class);
        int totalPages = (int) Math.ceil((double) totalElements / safeSize);
        if (totalPages == 0)
            totalPages = 1;

        // Apply pagination and sorting
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "datePrevue"));
        query.with(pageable);

        List<Collecte> collectes = mongoTemplate.find(query, Collecte.class);

        List<Map<String, Object>> enriched = collectes.stream()
                .map(this::enrichCollecte)
                .collect(Collectors.toList());

        return new PaginatedResponse<>(
                enriched,
                totalElements,
                totalPages,
                safePage + 1,
                safeSize);
    }

    public Map<String, Object> getById(String id) {
        Collecte collecte = collecteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Collecte introuvable"));
        return enrichCollecte(collecte);
    }

    /** Returns all collectes (minimal fields) for the calendar view. */
    public List<Map<String, Object>> getAllForCalendar() {
        List<Collecte> all = collecteRepository.findAll();
        return all.stream().map(c -> {
            Map<String, Object> item = new HashMap<>();
            item.put("id", c.getId());
            item.put("datePrevue", c.getDatePrevue() != null ? c.getDatePrevue().toString() : null);
            item.put("statut", c.getStatut());
            // resolve verger name
            String vergerNom = resolveVergerNom(c.getVergerId());
            item.put("vergerNom", vergerNom);
            // resolve chef récolte name
            String chefNom = resolveUserFullName(c.getChefRecolteId());
            item.put("chefRecolteNom", chefNom);
            item.put("equipeSize", c.getEquipeIds() != null ? c.getEquipeIds().size() : 0);
            return item;
        }).collect(Collectors.toList());
    }

    // ------------------------------------------------------------------ //
    // CREATE
    // ------------------------------------------------------------------ //

    public Collecte create(Collecte collecte) {
        // Enforce: no worker assignment at creation
        collecte.setEquipeIds(new ArrayList<>());
        // Enforce: status is always PLANIFIEE at creation
        collecte.setStatut("PLANIFIEE");

        // Business rule: one collecte per verger maximum
        if (collecte.getVergerId() != null && !collecte.getVergerId().isBlank()
                && collecteRepository.existsByVergerId(collecte.getVergerId())) {
            throw new RuntimeException(
                    "Une collecte existe déjà pour ce verger. Il est impossible de créer deux collectes pour le même verger.");
        }

        validateCollecte(collecte);
        collecte.setId(null);
        collecte.setCreatedAt(LocalDateTime.now());
        collecte.setUpdatedAt(LocalDateTime.now());
        return collecteRepository.save(collecte);
    }

    // ------------------------------------------------------------------ //
    // UPDATE
    // ------------------------------------------------------------------ //

    public Collecte update(String id, Collecte updated) {
        Collecte existing = collecteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Collecte introuvable"));

        // Business rule: no other collecte may target the same verger
        if (updated.getVergerId() != null && !updated.getVergerId().isBlank()
                && collecteRepository.existsByVergerIdAndIdNot(updated.getVergerId(), id)) {
            throw new RuntimeException(
                    "Une collecte existe déjà pour ce verger. Il est impossible d'affecter deux collectes au même verger.");
        }

        validateCollecte(updated);

        existing.setVergerId(updated.getVergerId());
        existing.setDatePrevue(updated.getDatePrevue());
        existing.setResponsableAffectationId(updated.getResponsableAffectationId());
        existing.setChefRecolteId(updated.getChefRecolteId());
        existing.setEquipeIds(updated.getEquipeIds());
        existing.setStatut(updated.getStatut());
        existing.setUpdatedAt(LocalDateTime.now());

        return collecteRepository.save(existing);
    }

    // ------------------------------------------------------------------ //
    // DELETE
    // ------------------------------------------------------------------ //

    public void delete(String id) {
        if (!collecteRepository.existsById(id)) {
            throw new RuntimeException("Collecte introuvable");
        }
        collecteRepository.deleteById(id);
    }

    // ------------------------------------------------------------------ //
    // BUSINESS RULE VALIDATION
    // ------------------------------------------------------------------ //

    private void validateCollecte(Collecte collecte) {
        // Required fields
        if (collecte.getVergerId() == null || collecte.getVergerId().isBlank()) {
            throw new RuntimeException("Le verger est obligatoire.");
        }
        if (collecte.getDatePrevue() == null) {
            throw new RuntimeException("La date prévue est obligatoire.");
        }
        if (collecte.getChefRecolteId() == null || collecte.getChefRecolteId().isBlank()) {
            throw new RuntimeException("Le chef de récolte est obligatoire.");
        }

        // Verger must exist and have statut PRET_POUR_RECOLTE
        Verger verger = vergerRepository.findById(collecte.getVergerId())
                .orElseThrow(() -> new RuntimeException("Verger introuvable."));
        if (!"PRET_POUR_RECOLTE".equals(verger.getStatut())) {
            throw new RuntimeException("Le verger doit avoir le statut PRET_POUR_RECOLTE.");
        }

        // Chef récolte must have role RESPONSABLE_CHEF_RECOLTE
        User chefRecolte = userRepository.findById(collecte.getChefRecolteId())
                .orElseThrow(() -> new RuntimeException("Chef de récolte introuvable."));
        if (chefRecolte.getRole() != Role.RESPONSABLE_CHEF_RECOLTE) {
            throw new RuntimeException("Le chef de récolte doit avoir le rôle RESPONSABLE_CHEF_RECOLTE.");
        }

        // Responsable affectation must have role RESPONSABLE_LOGISTIQUE (optional
        // field)
        if (collecte.getResponsableAffectationId() != null && !collecte.getResponsableAffectationId().isBlank()) {
            User responsible = userRepository.findById(collecte.getResponsableAffectationId())
                    .orElseThrow(() -> new RuntimeException("Responsable d'affectation introuvable."));
            if (responsible.getRole() != Role.RESPONSABLE_LOGISTIQUE) {
                throw new RuntimeException("Le responsable d'affectation doit avoir le rôle RESPONSABLE_LOGISTIQUE.");
            }
        }

        // All equipe members must have role OUVRIER
        if (collecte.getEquipeIds() != null) {
            for (String ouvrierId : collecte.getEquipeIds()) {
                User ouvrier = userRepository.findById(ouvrierId)
                        .orElseThrow(() -> new RuntimeException("Ouvrier introuvable: " + ouvrierId));
                if (ouvrier.getRole() != Role.OUVRIER) {
                    throw new RuntimeException("Tous les membres de l'équipe doivent avoir le rôle OUVRIER.");
                }
            }
        }
    }

    // ------------------------------------------------------------------ //
    // ENRICHMENT HELPERS
    // ------------------------------------------------------------------ //

    private Map<String, Object> enrichCollecte(Collecte c) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", c.getId());
        map.put("vergerId", c.getVergerId());
        map.put("vergerNom", resolveVergerNom(c.getVergerId()));
        map.put("datePrevue", c.getDatePrevue() != null ? c.getDatePrevue().toString() : null);
        map.put("statut", c.getStatut());
        map.put("createdBy", c.getCreatedBy());
        map.put("createdAt", c.getCreatedAt());
        map.put("updatedAt", c.getUpdatedAt());

        // Chef récolte
        map.put("chefRecolteId", c.getChefRecolteId());
        map.put("chefRecolteNom", resolveUserFullName(c.getChefRecolteId()));

        // Responsable affectation
        map.put("responsableAffectationId", c.getResponsableAffectationId());
        map.put("responsableAffectationNom", resolveUserFullName(c.getResponsableAffectationId()));

        // Équipe
        map.put("equipeIds", c.getEquipeIds());
        List<Map<String, String>> equipe = new ArrayList<>();
        if (c.getEquipeIds() != null) {
            for (String uid : c.getEquipeIds()) {
                userRepository.findById(uid).ifPresent(u -> {
                    Map<String, String> member = new HashMap<>();
                    member.put("id", u.getId());
                    member.put("nom", u.getPrenom() + " " + u.getNom());
                    equipe.add(member);
                });
            }
        }
        map.put("equipe", equipe);

        return map;
    }

    private String resolveUserFullName(String userId) {
        if (userId == null || userId.isBlank())
            return "";
        return userRepository.findById(userId)
                .map(u -> u.getPrenom() + " " + u.getNom())
                .orElse("");
    }

    private String resolveVergerNom(String vergerId) {
        if (vergerId == null || vergerId.isBlank())
            return "";
        return vergerRepository.findById(vergerId)
                .map(Verger::getNom)
                .orElse("");
    }
}
