package com.cooperative.olive.service;

import com.cooperative.olive.controller.PaginatedResponse;
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
    private static final Set<String> ACTIVE_TOURNEE_STATUSES = Set.of("PLANIFIEE", "EN_COURS");

    private final CollecteRepository collecteRepository;
    private final TourneeRepository tourneeRepository;
    private final UserRepository userRepository;
    private final VergerRepository vergerRepository;
    private final MongoTemplate mongoTemplate;
    private final CurrentUserService currentUserService;
    private final ResourceAllocationService resourceAllocationService;
    private final ActiviteService activiteService;

    public PaginatedResponse<Map<String, Object>> getAllPaginated(int page, int size, String chefRecolteId, String statut, Boolean hasResources) {
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

        List<Map<String, Object>> enriched = mongoTemplate.find(query, Collecte.class).stream()
                .map(this::enrichCollecte)
                .filter(item -> hasResources == null || hasResources.equals(collecteHasResources(item)))
                .collect(Collectors.toList());

        long totalElements = enriched.size();
        int totalPages = Math.max(1, (int) Math.ceil((double) totalElements / safeSize));
        int fromIndex = Math.min(safePage * safeSize, enriched.size());
        int toIndex = Math.min(fromIndex + safeSize, enriched.size());
        List<Map<String, Object>> pagedItems = enriched.subList(fromIndex, toIndex);

        return new PaginatedResponse<>(pagedItems, totalElements, totalPages, safePage + 1, safeSize);
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
            item.put("equipeSize", c.getAffectations() != null ? c.getAffectations().stream().filter(a -> "HUMAIN".equals(a.getTypeCible())).count() : 0);
            return item;
        }).collect(Collectors.toList());
    }

    public Collecte create(Collecte collecte) {
        currentUserService.requireRole(Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE);
        collecte.setStatut(collecte.getStatut() == null || collecte.getStatut().isBlank() ? "PLANIFIEE" : collecte.getStatut().trim().toUpperCase());
        collecte.setStatut(collecte.getStatut() == null || collecte.getStatut().isBlank() ? "PLANIFIEE" : collecte.getStatut().trim().toUpperCase());

        if (collecte.getVergerId() != null && !collecte.getVergerId().isBlank()
                && collecteRepository.existsByVergerId(collecte.getVergerId())) {
            throw new BusinessException("Une collecte existe deja pour ce verger.");
        }

        validateCollecte(collecte);
        List<Affectation> normalizedAssignments = resourceAllocationService.normalizeAndValidateAssignments(
                collecte.getAffectations(), List.of(), "COLLECTE", null
        );

        collecte.setId(null);
        collecte.setAffectations(normalizedAssignments);
        collecte.setCreatedBy(currentUserService.getRequiredCurrentUser().getId());
        collecte.setCreatedAt(LocalDateTime.now());
        collecte.setUpdatedAt(LocalDateTime.now());
        Collecte saved = collecteRepository.save(collecte);
        resourceAllocationService.applyResourceQuantityUpdate(List.of(), normalizedAssignments);

        activiteService.enregistrerPourUtilisateurCourant(
                ActiviteType.COLLECTE_CREE, "COLLECTE",
                "Collecte \"" + saved.getName() + "\" créée.",
                saved.getId(), saved.getName(),
                java.util.Map.of("statut", saved.getStatut()));

        return saved;
    }

    public Collecte update(String id, Collecte updated) {
        currentUserService.requireRole(Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE);
        Collecte existing = collecteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Collecte introuvable."));
        List<Affectation> previousAssignments = existing.getAffectations() == null
                ? List.of()
                : new ArrayList<>(existing.getAffectations());

        if (updated.getVergerId() != null && !updated.getVergerId().isBlank()
                && collecteRepository.existsByVergerIdAndIdNot(updated.getVergerId(), id)) {
            throw new BusinessException("Une collecte existe deja pour ce verger.");
        }

        validateCollecte(updated);
        List<Affectation> normalizedAssignments = resourceAllocationService.normalizeAndValidateAssignments(
                updated.getAffectations(), existing.getAffectations(), "COLLECTE", id
        );

        existing.setName(updated.getName().trim());
        existing.setVergerId(updated.getVergerId());
        existing.setDatePrevue(updated.getDatePrevue());
        existing.setResponsableAffectationId(updated.getResponsableAffectationId());
        existing.setChefRecolteId(updated.getChefRecolteId());
        existing.setStatut(updated.getStatut().trim().toUpperCase());
        existing.setStatut(updated.getStatut().trim().toUpperCase());
        existing.setAffectations(normalizedAssignments);
        existing.setUpdatedAt(LocalDateTime.now());
        Collecte saved = collecteRepository.save(existing);
        resourceAllocationService.applyResourceQuantityUpdate(previousAssignments, normalizedAssignments);

        ActiviteType type = ActiviteType.COLLECTE_MODIFIEE;
        String desc = "Collecte \"" + saved.getName() + "\" modifiée.";
        activiteService.enregistrerPourUtilisateurCourant(
                type, "COLLECTE", desc,
                saved.getId(), saved.getName(),
                java.util.Map.of("statut", saved.getStatut()));

        return saved;
    }

    public void delete(String id) {
        currentUserService.requireRole(Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE);
        Collecte collecte = collecteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Collecte introuvable."));
        ensureCollecteNotInActiveTournee(collecte.getId());
        List<Affectation> removedAssignments = collecte.getAffectations() == null
                ? List.of()
                : new ArrayList<>(collecte.getAffectations());
        collecteRepository.delete(collecte);
        resourceAllocationService.applyResourceQuantityUpdate(removedAssignments, List.of());

        activiteService.enregistrerPourUtilisateurCourant(
                ActiviteType.COLLECTE_SUPPRIMEE, "COLLECTE",
                "Collecte \"" + collecte.getName() + "\" supprimée.",
                id, collecte.getName(), java.util.Map.of());
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

        if (collecte.getAffectations() != null) {
            for (Affectation aff : collecte.getAffectations()) {
                if ("HUMAIN".equals(aff.getTypeCible())) {
                    User ouvrier = userRepository.findById(aff.getCibleId())
                            .orElseThrow(() -> new ResourceNotFoundException("Ouvrier introuvable: " + aff.getCibleId()));
                    if (ouvrier.getRole() != Role.OUVRIER) {
                        throw new BusinessException("Tous les membres de l'equipe doivent avoir le role OUVRIER.");
                    }
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
        // Resolve specific vs inherited workers
        List<String> specificOuvrierIds = collecte.getAffectations() == null ? List.of() :
            collecte.getAffectations().stream()
                .filter(a -> "HUMAIN".equals(a.getTypeCible()))
                .map(Affectation::getCibleId)
                .collect(Collectors.toList());

        Tournee owningTournee = findActiveTourneeForCollecte(collecte.getId());
        List<String> inheritedOuvrierIds = (owningTournee == null || owningTournee.getAffectations() == null) ? List.of() :
            owningTournee.getAffectations().stream()
                .filter(a -> "HUMAIN".equals(a.getTypeCible()))
                .map(Affectation::getCibleId)
                .collect(Collectors.toList());

        java.util.Set<String> allOuvrierIds = new java.util.HashSet<>(specificOuvrierIds);
        allOuvrierIds.addAll(inheritedOuvrierIds);
        map.put("equipeIds", new ArrayList<>(allOuvrierIds));

        map.put("tourneeId", owningTournee != null ? owningTournee.getId() : null);
        map.put("tourneeName", owningTournee != null ? owningTournee.getName() : null);
        
        // Populate inherited resources from Tournee
        map.put("inheritedAffectations", owningTournee == null
                ? List.of()
                : resourceAllocationService.enrichAssignments(owningTournee.getAffectations()));

        // Populate specific resources attached to this Collecte
        map.put("affectations", resourceAllocationService.enrichAssignments(collecte.getAffectations()));

        List<Map<String, String>> equipe = new ArrayList<>();
        if (!allOuvrierIds.isEmpty()) {
            for (String uid : allOuvrierIds) {
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

    private Tournee findActiveTourneeForCollecte(String collecteId) {
        if (collecteId == null || collecteId.isBlank()) {
            return null;
        }
        return tourneeRepository.findAll().stream()
                .filter(tournee -> ACTIVE_TOURNEE_STATUSES.contains(tournee.getStatus()))
                .filter(tournee -> tournee.getCollecteIds() != null && tournee.getCollecteIds().contains(collecteId))
                .findFirst()
                .orElse(null);
    }

    private boolean collecteHasResources(Map<String, Object> collecte) {
        Object inherited = collecte.get("inheritedAffectations");
        Object specific = collecte.get("affectations");
        boolean hasInherited = inherited instanceof List<?> inheritedList && !inheritedList.isEmpty();
        boolean hasSpecific = specific instanceof List<?> specificList && !specificList.isEmpty();
        return hasInherited || hasSpecific;
    }

    private void ensureCollecteNotInActiveTournee(String collecteId) {
        boolean linkedToActiveTournee = tourneeRepository.findAll().stream()
                .filter(tournee -> ACTIVE_TOURNEE_STATUSES.contains(tournee.getStatus()))
                .anyMatch(tournee -> tournee.getCollecteIds() != null && tournee.getCollecteIds().contains(collecteId));

        if (linkedToActiveTournee) {
            throw new BusinessException("Impossible de supprimer une collecte rattachee a une tournee active.");
        }
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
