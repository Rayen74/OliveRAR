package com.cooperative.olive.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import com.cooperative.olive.dao.CollecteRepository;
import com.cooperative.olive.dao.TourneeRepository;
import com.cooperative.olive.dao.VergerRepository;
import com.cooperative.olive.entity.ResourceAssignment;
import com.cooperative.olive.entity.Role;
import com.cooperative.olive.entity.Tournee;
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
    private final VergerRepository vergerRepository;
    private final MongoTemplate mongoTemplate;
    private final CurrentUserService currentUserService;
    private final ResourceAllocationService resourceAllocationService;

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
                .map(this::enrichTournee)
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

    public Map<String, Object> getById(String id) {
        currentUserService.requireRole(Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE, Role.RESPONSABLE_CHEF_RECOLTE);
        Tournee tournee = tourneeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tournee introuvable."));
        return enrichTournee(tournee);
    }

    public Tournee create(Tournee tournee) {
        currentUserService.requireRole(Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE);
        validateTournee(tournee);
        List<ResourceAssignment> normalizedAssignments = resourceAllocationService.normalizeAndValidateAssignments(
                tournee.getResourceAssignments(), List.of(), "TOURNEE", null
        );
        resourceAllocationService.applyResourceQuantityUpdate(List.of(), normalizedAssignments);

        tournee.setId(null);
        tournee.setCollecteIds(new ArrayList<>(tournee.getCollecteIds()));
        tournee.setResourceAssignments(normalizedAssignments);
        tournee.setStatus(normalizeStatus(tournee.getStatus()));
        tournee.setCreatedBy(currentUserService.getRequiredCurrentUser().getId());
        tournee.setCreatedAt(LocalDateTime.now());
        tournee.setUpdatedAt(LocalDateTime.now());
        return tourneeRepository.save(tournee);
    }

    public Tournee update(String id, Tournee updatedTournee) {
        currentUserService.requireRole(Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE);

        Tournee existing = tourneeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tournee introuvable."));

        validateTournee(updatedTournee);
        List<ResourceAssignment> normalizedAssignments = resourceAllocationService.normalizeAndValidateAssignments(
                updatedTournee.getResourceAssignments(), existing.getResourceAssignments(), "TOURNEE", id
        );
        resourceAllocationService.applyResourceQuantityUpdate(existing.getResourceAssignments(), normalizedAssignments);

        existing.setName(updatedTournee.getName().trim());
        existing.setCollecteIds(new ArrayList<>(updatedTournee.getCollecteIds()));
        existing.setDatePrevue(updatedTournee.getDatePrevue());
        existing.setPlannedStartTime(updatedTournee.getPlannedStartTime());
        existing.setPlannedEndTime(updatedTournee.getPlannedEndTime());
        existing.setOptimizationEnabled(Boolean.TRUE.equals(updatedTournee.getOptimizationEnabled()));
        existing.setResourceAssignments(normalizedAssignments);
        existing.setStatus(normalizeStatus(updatedTournee.getStatus()));
        existing.setUpdatedAt(LocalDateTime.now());
        return tourneeRepository.save(existing);
    }

    public void delete(String id) {
        currentUserService.requireRole(Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE);
        Tournee tournee = tourneeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tournee introuvable."));
        if (Set.of("EN_COURS", "TERMINEE").contains(tournee.getStatus())) {
            throw new BusinessException("Impossible de supprimer une tournee en cours ou terminee.");
        }
        resourceAllocationService.applyResourceQuantityUpdate(tournee.getResourceAssignments(), List.of());
        tourneeRepository.delete(tournee);
    }

    public Tournee addCollecte(String id, String collecteId) {
        currentUserService.requireRole(Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE);
        Tournee tournee = tourneeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tournee introuvable."));

        ensureCollecteExists(collecteId);
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

    public Tournee updateResources(String id, List<ResourceAssignment> resourceAssignments) {
        currentUserService.requireRole(Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE);
        Tournee tournee = tourneeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tournee introuvable."));

        List<ResourceAssignment> normalizedAssignments = resourceAllocationService.normalizeAndValidateAssignments(
                resourceAssignments, tournee.getResourceAssignments(), "TOURNEE", id
        );
        resourceAllocationService.applyResourceQuantityUpdate(tournee.getResourceAssignments(), normalizedAssignments);
        tournee.setResourceAssignments(normalizedAssignments);
        tournee.setUpdatedAt(LocalDateTime.now());
        return tourneeRepository.save(tournee);
    }

    private void validateTournee(Tournee tournee) {
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
            ensureCollecteExists(collecteId);
        }
    }

    private void validateCollecteCount(List<String> collecteIds) {
        if (collecteIds == null || collecteIds.size() < 2) {
            throw new BusinessException("Une tournee doit contenir au moins deux collectes.");
        }
    }

    private void ensureCollecteExists(String collecteId) {
        if (!collecteRepository.existsById(collecteId)) {
            throw new ResourceNotFoundException("Collecte introuvable: " + collecteId);
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
        item.put("collectes", buildCollecteDetails(tournee.getCollecteIds(), tournee.getResourceAssignments()));
        item.put("resourceAssignments", resourceAllocationService.enrichAssignments(tournee.getResourceAssignments()));
        return item;
    }

    private List<Map<String, Object>> buildCollecteDetails(List<String> collecteIds, List<ResourceAssignment> tourneeAssignments) {
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
                    details.put("inheritedResourceAssignments", resourceAllocationService.enrichAssignments(tourneeAssignments));
                    details.put("overriddenResourceAssignments", resourceAllocationService.enrichAssignments(collecte.getResourceAssignments()));
                    List<ResourceAssignment> mergedAssignments = mergeAssignments(tourneeAssignments, collecte.getResourceAssignments());
                    details.put("resourceAssignments", resourceAllocationService.enrichAssignments(mergedAssignments));
                    return details;
                })
                .collect(Collectors.toList());
    }

    private List<ResourceAssignment> mergeAssignments(List<ResourceAssignment> tourneeAssignments, List<ResourceAssignment> collecteAssignments) {
        Map<String, ResourceAssignment> merged = new HashMap<>();
        // Add tournee assignments
        for (ResourceAssignment ta : tourneeAssignments) {
            merged.put(ta.getUniteId(), ta);
        }
        // Override with collecte assignments
        for (ResourceAssignment ca : collecteAssignments) {
            merged.put(ca.getUniteId(), ca);
        }
        return new ArrayList<>(merged.values());
    }
}
