package com.cooperative.olive.service;

import com.cooperative.olive.dao.CollecteRepository;
import com.cooperative.olive.dao.ResourceRepository;
import com.cooperative.olive.dao.TourneeRepository;
import com.cooperative.olive.entity.ResourceStatus;
import com.cooperative.olive.entity.Role;
import com.cooperative.olive.entity.Tournee;
import com.cooperative.olive.entity.User;
import com.cooperative.olive.exception.BusinessException;
import com.cooperative.olive.exception.ResourceNotFoundException;
import com.cooperative.olive.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TourneeService {

    private final TourneeRepository tourneeRepository;
    private final CollecteRepository collecteRepository;
    private final ResourceRepository resourceRepository;
    private final CollecteService collecteService;

    private final CurrentUserService currentUserService;

    public List<Map<String, Object>> getAll() {
        currentUserService.requireRole(Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE, Role.RESPONSABLE_CHEF_RECOLTE);
        List<Tournee> tournees = tourneeRepository.findAll();
        return tournees.stream().map(this::enrichTournee).toList();
    }
    public List<Map<String, Object>> getMesTournees() {
        User current = currentUserService.getRequiredCurrentUser();
        List<Tournee> tournees;

        if (current.getRole() == Role.RESPONSABLE_LOGISTIQUE) {
            tournees = tourneeRepository.findByCreatedBy(current.getId());
        } else {
            tournees = tourneeRepository.findAll();
        }
        return tournees.stream().map(this::enrichTournee).toList();
    }

    // 4. Ajoute la méthode d'enrichissement
    private Map<String, Object> enrichTournee(Tournee tournee) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", tournee.getId());
        map.put("datePrevue", tournee.getDatePrevue());
        map.put("status", tournee.getStatus());
        map.put("collecteIds", tournee.getCollecteIds()); // On garde les IDs au cas où
        map.put("resourcesIds", tournee.getResourcesIds());
        map.put("agentIds", tournee.getAgentIds());

        // C'EST ICI QUE LA MAGIE OPÈRE :
        List<Map<String, Object>> detailsCollectes = new ArrayList<>();
        if (tournee.getCollecteIds() != null) {
            for (String id : tournee.getCollecteIds()) {
                try {
                    // On appelle la méthode du CollecteService qui remplit vergerNom, chefRecolteNom, etc.
                    detailsCollectes.add(collecteService.getById(id));
                } catch (Exception e) {
                    // Si une collecte a été supprimée entre temps
                }
            }
        }
        map.put("collectes", detailsCollectes);

        return map;
    }


    private void validateTournee(Tournee tournee) {
        if (tournee.getCollecteIds() == null || tournee.getCollecteIds().isEmpty()) {
            throw new BusinessException("Une tournée doit contenir au moins une collecte.");
        }
        // Changez à >= 1 si 2 minimum est trop restrictif

        for (String collecteId : tournee.getCollecteIds()) {
            if (!collecteRepository.existsById(collecteId)) {
                throw new ResourceNotFoundException("Collecte introuvable: " + collecteId);
            }
        }
    }
    public Tournee create(Tournee tournee) {
        currentUserService.requireRole(
                Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE
        );
        validateTournee(tournee);
        tournee.setId(null);
        tournee.setCreatedBy(currentUserService.getRequiredCurrentUser().getId());
        tournee.setCreatedAt(LocalDateTime.now());
        tournee.setUpdatedAt(LocalDateTime.now());

        Tournee saved = tourneeRepository.save(tournee);

        // ✅ Passer les ressources en RESERVE
        reserverRessources(tournee.getResourcesIds());

        return saved;
    }

    public Tournee update(String id, Tournee updatedTournee) {
        currentUserService.requireRole(
                Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE
        );
        Tournee existing = tourneeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tournée introuvable."));

        // ✅ Libérer les anciennes ressources avant de réserver les nouvelles
        libererRessources(existing.getResourcesIds());

        validateTournee(updatedTournee);
        existing.setCollecteIds(updatedTournee.getCollecteIds());
        existing.setAgentIds(updatedTournee.getAgentIds());
        existing.setResourcesIds(updatedTournee.getResourcesIds());
        existing.setDatePrevue(updatedTournee.getDatePrevue());
        existing.setStatus(updatedTournee.getStatus());
        existing.setUpdatedAt(LocalDateTime.now());

        Tournee saved = tourneeRepository.save(existing);

        // ✅ Si TERMINEE → libérer toutes les ressources
        if ("TERMINEE".equals(updatedTournee.getStatus())) {
            libererRessources(updatedTournee.getResourcesIds());
        } else {
            reserverRessources(updatedTournee.getResourcesIds());
        }

        return saved;
    }

    public void delete(String id) {
        currentUserService.requireRole(
                Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE
        );
        Tournee tournee = tourneeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tournée introuvable."));

        // ✅ Libérer les ressources avant suppression
        libererRessources(tournee.getResourcesIds());

        tourneeRepository.deleteById(id);
    }

    // ── Helpers statut ressources ─────────────────────────

    private void reserverRessources(List<String> resourcesIds) {
        if (resourcesIds == null) return;
        for (String rid : resourcesIds) {
            resourceRepository.findById(rid).ifPresent(r -> {
                r.setStatus(ResourceStatus.RESERVE);
                resourceRepository.save(r);
            });
        }
    }

    private void libererRessources(List<String> resourcesIds) {
        if (resourcesIds == null) return;
        for (String rid : resourcesIds) {
            resourceRepository.findById(rid).ifPresent(r -> {
                r.setStatus(ResourceStatus.DISPONIBLE);
                resourceRepository.save(r);
            });
        }
    }
}
