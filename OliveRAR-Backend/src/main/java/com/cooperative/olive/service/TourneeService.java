package com.cooperative.olive.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import com.cooperative.olive.dao.CollecteRepository;
import com.cooperative.olive.dao.TourneeRepository;
import com.cooperative.olive.dao.UserRepository;
import com.cooperative.olive.dao.VergerRepository;
import com.cooperative.olive.entity.ActiviteType;
import com.cooperative.olive.entity.Collecte;
import com.cooperative.olive.entity.Affectation;
import com.cooperative.olive.entity.Role;
import com.cooperative.olive.entity.Tournee;
import com.cooperative.olive.entity.User;
import com.cooperative.olive.entity.Verger;
import com.cooperative.olive.exception.BusinessException;
import com.cooperative.olive.exception.ResourceNotFoundException;
import com.cooperative.olive.security.CurrentUserService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TourneeService {

    private static final Set<String> ALLOWED_STATUSES = Set.of("PLANIFIEE", "EN_COURS", "TERMINEE", "ANNULEE");

    private final TourneeRepository tourneeRepository;
    private final CollecteRepository collecteRepository;
    private final UserRepository userRepository;
    private final VergerRepository vergerRepository;
    private final MongoTemplate mongoTemplate;
    private final CurrentUserService currentUserService;
    private final ResourceAllocationService resourceAllocationService;
    private final ActiviteService activiteService;

    public Map<String, Object> getAll(int page, int size, String search, String status) {
        currentUserService.requireRole(Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE, Role.RESPONSABLE_CHEF_RECOLTE);

        int safePage = Math.max(page, 0);
        int safeSize = size <= 0 ? 6 : Math.min(size, 50);
        Query query = new Query();

        if (search != null && !search.isBlank()) {
            query.addCriteria(Criteria.where("name").regex(".*" + java.util.regex.Pattern.quote(search.trim()) + ".*", "i"));
        }
        if (status != null && !status.isBlank()) {
            query.addCriteria(Criteria.where("status").is(status.trim().toUpperCase()));
        }

        long totalElements = mongoTemplate.count(query, Tournee.class);
        int totalPages = Math.max(1, (int) Math.ceil((double) totalElements / safeSize));
        query.with(org.springframework.data.domain.PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt")));

        List<Map<String, Object>> items = mongoTemplate.find(query, Tournee.class).stream()
                .map(this::toSummary)
                .toList();

        return Map.of(
                "success", true,
                "items", items,
                "page", safePage,
                "size", safeSize,
                "totalElements", totalElements,
                "totalPages", totalPages
        );
    }

    private Map<String, Object> toSummary(Tournee t) {
        return Map.of(
                "id", t.getId(),
                "name", t.getName(),
                "collecteIds", t.getCollecteIds(),
                "plannedStartTime", t.getPlannedStartTime() != null ? t.getPlannedStartTime() : "",
                "plannedEndTime", t.getPlannedEndTime() != null ? t.getPlannedEndTime() : "",
                "status", t.getStatus(),
                "optimizationEnabled", t.getOptimizationEnabled() != null && t.getOptimizationEnabled(),
                "affectations", resourceAllocationService.enrichAssignments(t.getAffectations())
        );
    }

    public Map<String, Object> getById(String id) {
        currentUserService.requireRole(Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE, Role.RESPONSABLE_CHEF_RECOLTE);
        Tournee tournee = tourneeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tournee introuvable."));
        return enrichTournee(tournee);
    }

    public Tournee create(Tournee tournee) {
        currentUserService.requireRole(Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE);
        validateTournee(tournee, null);
        List<Affectation> normalizedAssignments = resourceAllocationService.normalizeAndValidateAssignments(
                tournee.getAffectations(), List.of(), "TOURNEE", null
        );

        tournee.setId(null);
        tournee.setCollecteIds(new ArrayList<>(tournee.getCollecteIds()));
        tournee.setAffectations(normalizedAssignments);
        tournee.setStatus(normalizeStatus(tournee.getStatus()));
        tournee.setCreatedBy(currentUserService.getRequiredCurrentUser().getId());
        tournee.setCreatedAt(LocalDateTime.now());
        tournee.setUpdatedAt(LocalDateTime.now());
        Tournee saved = tourneeRepository.save(tournee);
        resourceAllocationService.applyResourceQuantityUpdate(List.of(), normalizedAssignments);

        activiteService.enregistrerPourUtilisateurCourant(
                ActiviteType.TOURNEE_CREEE, "TOURNEE",
                "Tournée \"" + saved.getName() + "\" créée.",
                saved.getId(), saved.getName(),
                java.util.Map.of("status", saved.getStatus()));

        return saved;
    }

    public Tournee update(String id, Tournee updatedTournee) {
        currentUserService.requireRole(Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE);

        Tournee existing = tourneeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tournee introuvable."));
        List<Affectation> previousAssignments = existing.getAffectations() == null
                ? List.of()
                : new ArrayList<>(existing.getAffectations());

        validateTournee(updatedTournee, id);
        List<Affectation> normalizedAssignments = resourceAllocationService.normalizeAndValidateAssignments(
                updatedTournee.getAffectations(), existing.getAffectations(), "TOURNEE", id
        );

        existing.setName(updatedTournee.getName().trim());
        existing.setCollecteIds(new ArrayList<>(updatedTournee.getCollecteIds()));
        existing.setDatePrevue(updatedTournee.getDatePrevue());
        existing.setPlannedStartTime(updatedTournee.getPlannedStartTime());
        existing.setPlannedEndTime(updatedTournee.getPlannedEndTime());
        existing.setOptimizationEnabled(Boolean.TRUE.equals(updatedTournee.getOptimizationEnabled()));
        existing.setAffectations(normalizedAssignments);
        existing.setStatus(normalizeStatus(updatedTournee.getStatus()));
        existing.setUpdatedAt(LocalDateTime.now());
        Tournee saved = tourneeRepository.save(existing);
        resourceAllocationService.applyResourceQuantityUpdate(previousAssignments, normalizedAssignments);

        ActiviteType type = ActiviteType.TOURNEE_MODIFIEE;
        String desc = "Tournée \"" + saved.getName() + "\" modifiée.";
        activiteService.enregistrerPourUtilisateurCourant(
                type, "TOURNEE", desc,
                saved.getId(), saved.getName(),
                java.util.Map.of("status", saved.getStatus()));

        return saved;
    }

    public void delete(String id) {
        currentUserService.requireRole(Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE);
        Tournee tournee = tourneeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tournee introuvable."));
        if (Set.of("EN_COURS", "TERMINEE").contains(tournee.getStatus())) {
            throw new BusinessException("Impossible de supprimer une tournee en cours ou terminee.");
        }
        tourneeRepository.delete(tournee);
        resourceAllocationService.applyResourceQuantityUpdate(tournee.getAffectations(), List.of());

        activiteService.enregistrerPourUtilisateurCourant(
                ActiviteType.TOURNEE_SUPPRIMEE, "TOURNEE",
                "Tournée \"" + tournee.getName() + "\" supprimée.",
                id, tournee.getName(), java.util.Map.of());
    }

    public Tournee addCollecte(String id, String collecteId) {
        currentUserService.requireRole(Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE);
        Tournee tournee = tourneeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tournee introuvable."));

        validateCollecteCanJoinTournee(collecteId, tournee.getId());
        if (!tournee.getCollecteIds().contains(collecteId)) {
            tournee.getCollecteIds().add(collecteId);
        }
        validateCollecteCount(tournee.getCollecteIds());
        tournee.setUpdatedAt(LocalDateTime.now());
        return tourneeRepository.save(tournee);
    }

    public Tournee removeCollecte(String id, String collecteId) {
        currentUserService.requireRole(Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE);
        Tournee tournee = tourneeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tournee introuvable."));

        List<String> updatedIds = new ArrayList<>(tournee.getCollecteIds());
        updatedIds.removeIf(collecteId::equals);
        validateCollecteCount(updatedIds);
        tournee.setCollecteIds(updatedIds);
        tournee.setUpdatedAt(LocalDateTime.now());
        return tourneeRepository.save(tournee);
    }

    public Tournee updateResources(String id, List<Affectation> Affectations) {
        currentUserService.requireRole(Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE);
        Tournee tournee = tourneeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tournee introuvable."));

        List<Affectation> normalizedAssignments = resourceAllocationService.normalizeAndValidateAssignments(
                Affectations, tournee.getAffectations(), "TOURNEE", id
        );
        List<Affectation> previousAssignments = tournee.getAffectations() == null
                ? List.of()
                : new ArrayList<>(tournee.getAffectations());
        tournee.setAffectations(normalizedAssignments);
        tournee.setUpdatedAt(LocalDateTime.now());
        Tournee saved = tourneeRepository.save(tournee);
        resourceAllocationService.applyResourceQuantityUpdate(previousAssignments, normalizedAssignments);

        activiteService.enregistrerPourUtilisateurCourant(
                ActiviteType.TOURNEE_EQUIPEMENT_AFFECTE, "TOURNEE",
                "Mise à jour des équipements pour la tournée \"" + saved.getName() + "\".",
                saved.getId(), saved.getName(), java.util.Map.of());

        return saved;
    }

    private void validateTournee(Tournee tournee, String currentTourneeId) {
        if (tournee.getName() == null || tournee.getName().isBlank()) {
            throw new BusinessException("Le nom de la tournee est obligatoire.");
        }
        validateCollecteCount(tournee.getCollecteIds());
        if (tournee.getStatus() == null || !ALLOWED_STATUSES.contains(normalizeStatus(tournee.getStatus()))) {
            throw new BusinessException("Statut de tournee invalide.");
        }
        if (tournee.getPlannedStartTime() == null) {
            throw new BusinessException("La date de debut de la tournee est obligatoire.");
        }
        if (tournee.getPlannedEndTime() == null) {
            throw new BusinessException("La date de fin de la tournee est obligatoire.");
        }
        if (!tournee.getPlannedEndTime().isAfter(tournee.getPlannedStartTime())) {
            throw new BusinessException("La date de fin doit etre apres la date de debut.");
        }
        for (String collecteId : tournee.getCollecteIds()) {
            validateCollecteCanJoinTournee(collecteId, currentTourneeId);
        }
    }

    private void validateCollecteCount(List<String> collecteIds) {
        if (collecteIds == null || collecteIds.isEmpty()) {
            throw new BusinessException("Une tournee doit contenir au moins une collecte.");
        }
        if (new HashSet<>(collecteIds).size() != collecteIds.size()) {
            throw new BusinessException("Une meme collecte ne peut pas etre ajoutee deux fois a la tournee.");
        }
    }

    private void ensureCollecteExists(String collecteId) {
        if (!collecteRepository.existsById(collecteId)) {
            throw new ResourceNotFoundException("Collecte introuvable: " + collecteId);
        }
    }

    private void validateCollecteCanJoinTournee(String collecteId, String currentTourneeId) {
        Collecte collecte = collecteRepository.findById(collecteId)
                .orElseThrow(() -> new ResourceNotFoundException("Collecte introuvable: " + collecteId));

        if (Set.of("TERMINEE", "ANNULEE").contains(collecte.getStatut())) {
            throw new BusinessException("Une collecte terminee ou annulee ne peut pas etre ajoutee a une tournee.");
        }

        // Hybrid Approach Rule:
        // A collecte can belong to at most ONE active tournee.
        // This prevents ambiguity regarding which "common/shared" resources the collecte inherits.
        boolean alreadyInActiveTournee = tourneeRepository.findAll().stream()
                .filter(t -> currentTourneeId == null || !t.getId().equals(currentTourneeId))
                .filter(t -> !Set.of("TERMINEE", "ANNULEE").contains(normalizeStatus(t.getStatus())))
                .anyMatch(t -> t.getCollecteIds() != null && t.getCollecteIds().contains(collecteId));

        if (alreadyInActiveTournee) {
            throw new BusinessException("Cette collecte appartient deja a une autre tournee active.");
        }
    }

    private String normalizeStatus(String status) {
        return status == null ? "" : status.trim().toUpperCase();
    }

    private Map<String, Object> enrichTournee(Tournee tournee) {
        Map<String, Object> item = new HashMap<>();
        item.put("id", tournee.getId());
        item.put("name", tournee.getName());
        item.put("collecteIds", tournee.getCollecteIds());
        item.put("datePrevue", tournee.getDatePrevue() != null ? tournee.getDatePrevue().toString() : null);
        item.put("plannedStartTime", tournee.getPlannedStartTime());
        item.put("plannedEndTime", tournee.getPlannedEndTime());
        item.put("optimizationEnabled", Boolean.TRUE.equals(tournee.getOptimizationEnabled()));
        item.put("status", tournee.getStatus());
        item.put("createdAt", tournee.getCreatedAt());
        item.put("updatedAt", tournee.getUpdatedAt());
        List<Map<String, Object>> collecteDetails = buildCollecteDetails(tournee.getCollecteIds(), tournee.getAffectations());
        item.put("collectes", collecteDetails);
        item.put("equipe", buildEquipeForTournee(collecteDetails));
        item.put("affectations", resourceAllocationService.enrichAssignments(tournee.getAffectations()));
        return item;
    }

    private List<Map<String, Object>> buildCollecteDetails(List<String> collecteIds, List<Affectation> tourneeAssignments) {
        return collecteIds.stream()
                .map(collecteRepository::findById)
                .flatMap(java.util.Optional::stream)
                .map(collecte -> {
                    Map<String, Object> details = new HashMap<>();
                    details.put("id", collecte.getId());
                    details.put("name", collecte.getName());
                    details.put("datePrevue", collecte.getDatePrevue() != null ? collecte.getDatePrevue().toString() : null);
                    details.put("statut", collecte.getStatut());
                    Verger verger = vergerRepository.findById(collecte.getVergerId()).orElse(null);
                    details.put("vergerId", collecte.getVergerId());
                    details.put("vergerNom", verger != null ? verger.getNom() : "");
                    details.put("localisation", verger != null ? verger.getLocalisation() : "");
                    details.put("latitude", verger != null ? verger.getLatitude() : null);
                    details.put("longitude", verger != null ? verger.getLongitude() : null);
                    details.put("equipe", buildEquipeDetails(collecte));
                    details.put("inheritedAffectations", resourceAllocationService.enrichAssignments(tourneeAssignments));
                    details.put("affectations", resourceAllocationService.enrichAssignments(collecte.getAffectations()));
                    List<Affectation> mergedAssignments = mergeAssignments(tourneeAssignments, collecte.getAffectations());
                    details.put("mergedAffectations", resourceAllocationService.enrichAssignments(mergedAssignments));
                    return details;
                })
                .collect(Collectors.toList());
    }

    private List<Affectation> mergeAssignments(List<Affectation> tourneeAssignments, List<Affectation> collecteAssignments) {
        Map<String, Affectation> merged = new HashMap<>();
        
        // Hybrid Approach:
        // 1. Add tournee assignments as the base (inherited/common resources)
        for (Affectation ta : tourneeAssignments) {
            merged.put(ta.getCibleId(), ta);
        }
        
        // 2. Override with collecte assignments (specific/exceptional resources)
        // If a collecte specifies an assignment for the same unit, it takes precedence.
        for (Affectation ca : collecteAssignments) {
            merged.put(ca.getCibleId(), ca);
        }
        return new ArrayList<>(merged.values());
    }

    private List<Map<String, String>> buildEquipeForTournee(List<Map<String, Object>> collecteDetails) {
        Map<String, Map<String, String>> equipe = new LinkedHashMap<>();
        for (Map<String, Object> collecte : collecteDetails) {
            Object membres = collecte.get("equipe");
            if (membres instanceof List<?> membresList) {
                for (Object membre : membresList) {
                    if (membre instanceof Map<?, ?> membreMap) {
                        Object id = membreMap.get("id");
                        Object nom = membreMap.get("nom");
                        if (id instanceof String idStr && nom instanceof String nomStr) {
                            equipe.putIfAbsent(idStr, Map.of("id", idStr, "nom", nomStr));
                        }
                    }
                }
            }
        }
        return new ArrayList<>(equipe.values());
    }

    private List<Map<String, String>> buildEquipeDetails(Collecte collecte) {
        List<Map<String, String>> equipe = new ArrayList<>();
        if (collecte.getAffectations() != null) {
            for (Affectation aff : collecte.getAffectations()) {
                if ("HUMAIN".equals(aff.getTypeCible())) {
                    userRepository.findById(aff.getCibleId()).ifPresent(user -> equipe.add(toEquipeMember(user)));
                }
            }
        }
        return equipe;
    }

    private Map<String, String> toEquipeMember(User user) {
        return Map.of(
                "id", user.getId(),
                "nom", user.getPrenom() + " " + user.getNom()
        );
    }
    public List<Map<String, Object>> getCalendarData() {
        currentUserService.requireRole(Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE, Role.RESPONSABLE_CHEF_RECOLTE);
        return tourneeRepository.findAll().stream().map(t -> {
            Map<String, Object> item = new HashMap<>();
            item.put("id", t.getId());
            item.put("name", t.getName());
            item.put("datePrevue", t.getDatePrevue() != null ? t.getDatePrevue().toString() : null);
            item.put("status", t.getStatus());
            
            List<String> vergerNames = t.getCollecteIds().stream()
                    .map(collecteRepository::findById)
                    .flatMap(java.util.Optional::stream)
                    .map(c -> vergerRepository.findById(c.getVergerId()))
                    .flatMap(java.util.Optional::stream)
                    .map(Verger::getNom)
                    .distinct()
                    .collect(Collectors.toList());
            item.put("vergerNames", vergerNames);
            item.put("resourceCount", t.getAffectations() != null ? t.getAffectations().size() : 0);
            return item;
        }).collect(Collectors.toList());
    }
}
