package com.cooperative.olive.service;

import com.cooperative.olive.controller.PaginatedResponse;
import com.cooperative.olive.dao.CollecteRepository;
import com.cooperative.olive.dao.UserRepository;
import com.cooperative.olive.dao.VergerRepository;
import com.cooperative.olive.entity.Collecte;
import com.cooperative.olive.entity.ResourceAssignment;
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

import java.time.LocalDateTime;
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
    private final ResourceAllocationService resourceAllocationService;

    public PaginatedResponse<Map<String, Object>> getAllPaginated(int page, int size, String chefRecolteId, String statut) {
        currentUserService.requireRole(Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE, Role.RESPONSABLE_CHEF_RECOLTE);

        int safePage = Math.max(page, 0);
        int safeSize = size <= 0 ? 5 : Math.min(size, 50);

        Query query = new Query();
        if (chefRecolteId != null && !chefRecolteId.isBlank()) {
            query.addCriteria(Criteria.where("chefRecolteId").is(chefRecolteId));
        }
        if (statut != null && !statut.isBlank()) {
            query.addCriteria(Criteria.where("statut").is(statut));
        }

        long totalElements = mongoTemplate.count(query, Collecte.class);
        int totalPages = Math.max(1, (int) Math.ceil((double) totalElements / safeSize));
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "datePrevue"));
        query.with(pageable);

        List<Map<String, Object>> enriched = mongoTemplate.find(query, Collecte.class).stream()
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

    public List<Map<String, Object>> getAllForCalendar() {
        currentUserService.requireRole(Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE, Role.RESPONSABLE_CHEF_RECOLTE);
        return collecteRepository.findAll().stream().map(c -> {
            Map<String, Object> item = new HashMap<>();
            item.put("id", c.getId());
            item.put("name", c.getName());
            item.put("datePrevue", c.getDatePrevue() != null ? c.getDatePrevue().toString() : null);
            item.put("statut", c.getStatut());
            item.put("vergerNom", resolveVergerNom(c.getVergerId()));
            item.put("chefRecolteNom", resolveUserFullName(c.getChefRecolteId()));
            item.put("equipeSize", c.getEquipeIds() != null ? c.getEquipeIds().size() : 0);
            return item;
        }).collect(Collectors.toList());
    }

    public Collecte create(Collecte collecte) {
        currentUserService.requireRole(Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE);
        collecte.setEquipeIds(collecte.getEquipeIds() == null ? new ArrayList<>() : collecte.getEquipeIds());
        collecte.setStatut(collecte.getStatut() == null || collecte.getStatut().isBlank() ? "PLANIFIEE" : collecte.getStatut().trim().toUpperCase());

        if (collecte.getVergerId() != null && !collecte.getVergerId().isBlank()
                && collecteRepository.existsByVergerId(collecte.getVergerId())) {
            throw new BusinessException("Une collecte existe deja pour ce verger.");
        }

        validateCollecte(collecte);
        List<ResourceAssignment> normalizedAssignments = resourceAllocationService.normalizeAndValidateAssignments(
                collecte.getResourceAssignments(), List.of(), "COLLECTE", null
        );
        resourceAllocationService.applyResourceQuantityUpdate(List.of(), normalizedAssignments);

        collecte.setId(null);
        collecte.setResourceAssignments(normalizedAssignments);
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
            throw new BusinessException("Une collecte existe deja pour ce verger.");
        }

        validateCollecte(updated);
        List<ResourceAssignment> normalizedAssignments = resourceAllocationService.normalizeAndValidateAssignments(
                updated.getResourceAssignments(), existing.getResourceAssignments(), "COLLECTE", id
        );
        resourceAllocationService.applyResourceQuantityUpdate(existing.getResourceAssignments(), normalizedAssignments);

        existing.setName(updated.getName().trim());
        existing.setVergerId(updated.getVergerId());
        existing.setDatePrevue(updated.getDatePrevue());
        existing.setResponsableAffectationId(updated.getResponsableAffectationId());
        existing.setChefRecolteId(updated.getChefRecolteId());
        existing.setEquipeIds(updated.getEquipeIds() != null ? updated.getEquipeIds() : new ArrayList<>());
        existing.setStatut(updated.getStatut().trim().toUpperCase());
        existing.setResourceAssignments(normalizedAssignments);
        existing.setUpdatedAt(LocalDateTime.now());
        return collecteRepository.save(existing);
    }

    public void delete(String id) {
        currentUserService.requireRole(Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE);
        Collecte collecte = collecteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Collecte introuvable."));
        resourceAllocationService.applyResourceQuantityUpdate(collecte.getResourceAssignments(), List.of());
        collecteRepository.delete(collecte);
    }

    private void validateCollecte(Collecte collecte) {
        if (collecte.getName() == null || collecte.getName().isBlank()) {
            throw new BusinessException("Le nom de la collecte est obligatoire.");
        }
        if (collecte.getVergerId() == null || collecte.getVergerId().isBlank()) {
            throw new BusinessException("Le verger est obligatoire.");
        }
        if (collecte.getDatePrevue() == null) {
            throw new BusinessException("La date prevue est obligatoire.");
        }
        if (collecte.getChefRecolteId() == null || collecte.getChefRecolteId().isBlank()) {
            throw new BusinessException("Le chef de recolte est obligatoire.");
        }
        if (collecte.getStatut() == null || !ALLOWED_STATUTS.contains(collecte.getStatut().trim().toUpperCase())) {
            throw new BusinessException("Statut de collecte invalide.");
        }

        Verger verger = vergerRepository.findById(collecte.getVergerId())
                .orElseThrow(() -> new ResourceNotFoundException("Verger introuvable."));
        if (!"PRET_POUR_RECOLTE".equals(verger.getStatut())) {
            throw new BusinessException("Le verger doit avoir le statut PRET_POUR_RECOLTE.");
        }

        User chefRecolte = userRepository.findById(collecte.getChefRecolteId())
                .orElseThrow(() -> new ResourceNotFoundException("Chef de recolte introuvable."));
        if (chefRecolte.getRole() != Role.RESPONSABLE_CHEF_RECOLTE) {
            throw new BusinessException("Le chef de recolte doit avoir le role RESPONSABLE_CHEF_RECOLTE.");
        }

        if (collecte.getResponsableAffectationId() != null && !collecte.getResponsableAffectationId().isBlank()) {
            User responsable = userRepository.findById(collecte.getResponsableAffectationId())
                    .orElseThrow(() -> new ResourceNotFoundException("Responsable d'affectation introuvable."));
            if (responsable.getRole() != Role.RESPONSABLE_LOGISTIQUE) {
                throw new BusinessException("Le responsable d'affectation doit avoir le role RESPONSABLE_LOGISTIQUE.");
            }
        }

        if (collecte.getEquipeIds() != null) {
            for (String ouvrierId : collecte.getEquipeIds()) {
                User ouvrier = userRepository.findById(ouvrierId)
                        .orElseThrow(() -> new ResourceNotFoundException("Ouvrier introuvable: " + ouvrierId));
                if (ouvrier.getRole() != Role.OUVRIER) {
                    throw new BusinessException("Tous les membres de l'equipe doivent avoir le role OUVRIER.");
                }

                // Check if worker is already assigned to another collecte on the same day
                boolean isBusy = collecteRepository.findAll().stream()
                        .filter(c -> collecte.getId() == null || !c.getId().equals(collecte.getId()))
                        .filter(c -> c.getDatePrevue().equals(collecte.getDatePrevue()))
                        .anyMatch(c -> c.getEquipeIds() != null && c.getEquipeIds().contains(ouvrierId));

                if (isBusy) {
                    throw new BusinessException("L'ouvrier " + ouvrier.getPrenom() + " " + ouvrier.getNom() + " est deja affecté à une autre collecte pour la date du " + collecte.getDatePrevue() + ".");
                }
            }
        }
    }

    private Map<String, Object> enrichCollecte(Collecte collecte) {
        Map<String, Object> map = new HashMap<>();
        Verger verger = vergerRepository.findById(collecte.getVergerId()).orElse(null);
        map.put("id", collecte.getId());
        map.put("name", collecte.getName());
        map.put("vergerId", collecte.getVergerId());
        map.put("vergerNom", resolveVergerNom(collecte.getVergerId()));
        map.put("localisation", verger != null ? verger.getLocalisation() : "");
        map.put("latitude", verger != null ? verger.getLatitude() : null);
        map.put("longitude", verger != null ? verger.getLongitude() : null);
        map.put("datePrevue", collecte.getDatePrevue() != null ? collecte.getDatePrevue().toString() : null);
        map.put("statut", collecte.getStatut());
        map.put("createdBy", collecte.getCreatedBy());
        map.put("createdAt", collecte.getCreatedAt());
        map.put("updatedAt", collecte.getUpdatedAt());
        map.put("chefRecolteId", collecte.getChefRecolteId());
        map.put("chefRecolteNom", resolveUserFullName(collecte.getChefRecolteId()));
        map.put("responsableAffectationId", collecte.getResponsableAffectationId());
        map.put("responsableAffectationNom", resolveUserFullName(collecte.getResponsableAffectationId()));
        map.put("equipeIds", collecte.getEquipeIds());
        map.put("resourceAssignments", resourceAllocationService.enrichAssignments(collecte.getResourceAssignments()));

        List<Map<String, String>> equipe = new ArrayList<>();
        if (collecte.getEquipeIds() != null) {
            for (String uid : collecte.getEquipeIds()) {
                userRepository.findById(uid).ifPresent(user -> {
                    Map<String, String> member = new HashMap<>();
                    member.put("id", user.getId());
                    member.put("nom", user.getPrenom() + " " + user.getNom());
                    equipe.add(member);
                });
            }
        }
        map.put("equipe", equipe);
        return map;
    }

    private String resolveUserFullName(String userId) {
        if (userId == null || userId.isBlank()) {
            return "";
        }
        return userRepository.findById(userId)
                .map(user -> user.getPrenom() + " " + user.getNom())
                .orElse("");
    }

    private String resolveVergerNom(String vergerId) {
        if (vergerId == null || vergerId.isBlank()) {
            return "";
        }
        return vergerRepository.findById(vergerId)
                .map(Verger::getNom)
                .orElse("");
    }
}
