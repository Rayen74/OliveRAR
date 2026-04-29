package com.cooperative.olive.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;

import com.cooperative.olive.dao.CollecteRepository;
import com.cooperative.olive.dao.UniteRepository;
import com.cooperative.olive.dao.TypeRessourceRepository;
import com.cooperative.olive.dao.TourneeRepository;
import com.cooperative.olive.dao.UserRepository;
import com.cooperative.olive.entity.Unite;
import com.cooperative.olive.entity.TypeRessource;
import com.cooperative.olive.entity.UniteStatut;
import com.cooperative.olive.entity.ResourceAssignment;
import com.cooperative.olive.entity.Role;
import com.cooperative.olive.entity.User;
import com.cooperative.olive.exception.BusinessException;
import com.cooperative.olive.exception.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ResourceAllocationService {

    private static final Set<String> ALLOWED_ASSIGNMENT_STATUSES = Set.of("PLANIFIEE", "EN_COURS", "TERMINEE", "ANNULEE");

    private final UniteRepository uniteRepository;
    private final TypeRessourceRepository typeRessourceRepository;
    private final CollecteRepository collecteRepository;
    private final TourneeRepository tourneeRepository;
    private final UserRepository userRepository;

    public List<ResourceAssignment> normalizeAndValidateAssignments(
            List<ResourceAssignment> incomingAssignments,
            List<ResourceAssignment> existingAssignments,
            String ownerType,
            String ownerId
    ) {
        List<ResourceAssignment> sanitizedAssignments = incomingAssignments == null ? new ArrayList<>() : incomingAssignments;

        for (ResourceAssignment assignment : sanitizedAssignments) {
            validateSingleAssignment(assignment, ownerType, ownerId);
        }

        return sanitizedAssignments.stream().map(this::normalizeAssignment).toList();
    }

    public void applyResourceQuantityUpdate(List<ResourceAssignment> existingAssignments, List<ResourceAssignment> updatedAssignments) {
        // Obsolete in new architecture: Unités represent physical objects, not a pool of quantities to decrement/increment.
        // The assignment conflict checking guarantees that a given Unite is not double-booked in overlapping time slots.
        // Therefore, we don't need to mutate global quantity counters anymore.
    }

    public List<Map<String, Object>> enrichAssignments(List<ResourceAssignment> assignments) {
        if (assignments == null) {
            return List.of();
        }

        return assignments.stream().map(assignment -> {
            Unite unite = uniteRepository.findById(assignment.getUniteId()).orElse(null);
            TypeRessource type = null;
            if (unite != null && unite.getTypeId() != null) {
                type = typeRessourceRepository.findById(unite.getTypeId()).orElse(null);
            }

            return Map.of(
                    "uniteId", assignment.getUniteId(),
                    "startTime", assignment.getStartTime(),
                    "endTime", assignment.getEndTime(),
                    "status", assignment.getStatus(),
                    "resource", unite == null ? Map.of() : Map.of( // Kept as "resource" on frontend to minimize UI breaking changes
                            "id", unite.getId(),
                            "name", type != null ? type.getNom() : unite.getCodeUnique(),
                            "type", type != null && type.getCategorie() != null ? type.getCategorie().name() : "",
                            "quantity", 1, // Always 1 for physical units
                            "status", unite.getStatut().name()
                    ),
                    "unite", unite == null ? Map.of() : Map.of(
                            "id", unite.getId(),
                            "codeUnique", unite.getCodeUnique(),
                            "statut", unite.getStatut().name(),
                            "type", type != null ? type.getNom() : ""
                    )
            );
        }).toList();
    }

    private void validateSingleAssignment(
            ResourceAssignment assignment,
            String ownerType,
            String ownerId
    ) {
        if (assignment.getUniteId() == null || assignment.getUniteId().isBlank()) {
            throw new BusinessException("L'unité de ressource est obligatoire.");
        }
        if (assignment.getStartTime() == null || assignment.getEndTime() == null || !assignment.getEndTime().isAfter(assignment.getStartTime())) {
            throw new BusinessException("Le creneau horaire de l'affectation est invalide.");
        }
        if (assignment.getStatus() == null || !ALLOWED_ASSIGNMENT_STATUSES.contains(assignment.getStatus().trim().toUpperCase())) {
            throw new BusinessException("Le statut de l'affectation est invalide.");
        }

        Unite unite = uniteRepository.findById(assignment.getUniteId())
                .orElseThrow(() -> new ResourceNotFoundException("Unité introuvable: " + assignment.getUniteId()));

        if (unite.getStatut() == UniteStatut.EN_MAINTENANCE || unite.getStatut() == UniteStatut.EN_PANNE || unite.getStatut() == UniteStatut.HORS_SERVICE) {
            throw new BusinessException("L'unité " + unite.getCodeUnique() + " n'est pas disponible (Statut actuel: " + unite.getStatut().name() + ").");
        }

        boolean isOverlapping = isUniteOverlapping(
                assignment.getUniteId(),
                assignment.getStartTime(),
                assignment.getEndTime(),
                ownerType,
                ownerId
        );
        
        if (isOverlapping) {
            throw new BusinessException("Conflit horaire detecté pour l'unité " + unite.getCodeUnique() + ".");
        }

        return;
    }

    private ResourceAssignment normalizeAssignment(ResourceAssignment assignment) {
        ResourceAssignment norm = new ResourceAssignment();
        norm.setUniteId(assignment.getUniteId());
        norm.setStartTime(assignment.getStartTime());
        norm.setEndTime(assignment.getEndTime());
        norm.setStatus(assignment.getStatus() == null ? "PLANIFIEE" : assignment.getStatus().trim().toUpperCase());
        return norm;
    }

    private boolean isUniteOverlapping(
            String uniteId,
            LocalDateTime startTime,
            LocalDateTime endTime,
            String ownerType,
            String ownerId
    ) {
        boolean inCollectes = collecteRepository.findAll().stream()
                .filter(collecte -> !("COLLECTE".equals(ownerType) && collecte.getId().equals(ownerId)))
                .flatMap(collecte -> (collecte.getResourceAssignments() == null ? List.<ResourceAssignment>of() : collecte.getResourceAssignments()).stream())
                .filter(assignment -> uniteId.equals(assignment.getUniteId()))
                .anyMatch(assignment -> overlaps(assignment.getStartTime(), assignment.getEndTime(), startTime, endTime));

        if (inCollectes) return true;

        return tourneeRepository.findAll().stream()
                .filter(tournee -> !("TOURNEE".equals(ownerType) && tournee.getId().equals(ownerId)))
                .flatMap(tournee -> (tournee.getResourceAssignments() == null ? List.<ResourceAssignment>of() : tournee.getResourceAssignments()).stream())
                .filter(assignment -> uniteId.equals(assignment.getUniteId()))
                .anyMatch(assignment -> overlaps(assignment.getStartTime(), assignment.getEndTime(), startTime, endTime));
    }


    private boolean overlaps(LocalDateTime firstStart, LocalDateTime firstEnd, LocalDateTime secondStart, LocalDateTime secondEnd) {
        return firstStart.isBefore(secondEnd) && firstEnd.isAfter(secondStart);
    }
}
