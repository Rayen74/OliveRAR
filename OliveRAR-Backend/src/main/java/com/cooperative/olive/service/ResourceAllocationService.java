package com.cooperative.olive.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import com.cooperative.olive.entity.Tournee;
import com.cooperative.olive.entity.Collecte;
import com.cooperative.olive.entity.User;
import com.cooperative.olive.dao.UserRepository;
import com.cooperative.olive.dao.TypeRessourceRepository;
import com.cooperative.olive.dao.UniteRepository;
import com.cooperative.olive.entity.Affectation;
import com.cooperative.olive.entity.TypeRessource;
import com.cooperative.olive.entity.Unite;
import com.cooperative.olive.entity.UniteStatut;
import com.cooperative.olive.exception.BusinessException;
import com.cooperative.olive.exception.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ResourceAllocationService {

    private static final Set<String> ALLOWED_ASSIGNMENT_STATUSES = Set.of("PLANIFIEE", "EN_COURS", "TERMINEE", "ANNULEE");
    private static final Set<String> ACTIVE_ASSIGNMENT_STATUSES = Set.of("PLANIFIEE", "EN_COURS");

    private final UniteRepository uniteRepository;
    private final TypeRessourceRepository typeRessourceRepository;
    private final UserRepository userRepository;
    private final MongoTemplate mongoTemplate;

    public List<Affectation> normalizeAndValidateAssignments(
            List<Affectation> incomingAssignments,
            List<Affectation> existingAssignments,
            String ownerType,
            String ownerId
    ) {
        List<Affectation> sanitizedAssignments = incomingAssignments == null ? new ArrayList<>() : incomingAssignments;

        for (Affectation assignment : sanitizedAssignments) {
            validateSingleAssignment(assignment, ownerType, ownerId);
        }
        validateInternalOverlaps(sanitizedAssignments);

        return sanitizedAssignments.stream().map(this::normalizeAssignment).toList();
    }

    public void applyResourceQuantityUpdate(List<Affectation> existingAssignments, List<Affectation> updatedAssignments) {
        // Hybrid model approach:
        // We no longer lock the global 'UniteStatut' to AFFECTE just because there is a future assignment.
        // This allows resources to remain DISPONIBLE for UI selection at other dates.
        // The true availability is strictly enforced dynamically via isUniteOverlapping() time intersection.
    }

    public List<Map<String, Object>> enrichAssignments(List<Affectation> assignments) {
        if (assignments == null) {
            return List.of();
        }

        return assignments.stream().map(assignment -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("cibleId", assignment.getCibleId());
            map.put("typeCible", assignment.getTypeCible());
            map.put("niveau", assignment.getNiveau());
            map.put("startTime", assignment.getStartTime());
            map.put("endTime", assignment.getEndTime());
            map.put("statutReservation", assignment.getStatutReservation());
            map.put("statutOperationnel", assignment.getStatutOperationnel());

            if ("HUMAIN".equals(assignment.getTypeCible())) {
                User user = userRepository.findById(assignment.getCibleId()).orElse(null);
                map.put("resource", user == null ? Map.of() : Map.of(
                        "id", user.getId(),
                        "name", user.getPrenom() + " " + user.getNom(),
                        "type", "HUMAIN",
                        "quantity", 1,
                        "status", "DISPONIBLE"
                ));
            } else {
                Unite unite = uniteRepository.findById(assignment.getCibleId()).orElse(null);
                TypeRessource type = null;
                if (unite != null && unite.getTypeId() != null) {
                    type = typeRessourceRepository.findById(unite.getTypeId()).orElse(null);
                }
                map.put("resource", unite == null ? Map.of() : Map.of(
                        "id", unite.getId(),
                        "codeUnique", unite.getCodeUnique(),
                        "name", unite.getCodeUnique() + (type != null ? " (" + type.getNom() + ")" : ""),
                        "type", type != null && type.getCategorie() != null ? type.getCategorie().name() : "",
                        "quantity", 1,
                        "status", unite.getStatut().name()
                ));
            }
            return map;
        }).toList();
    }

    private void validateSingleAssignment(Affectation assignment, String ownerType, String ownerId) {
        if (assignment.getCibleId() == null || assignment.getCibleId().isBlank()) {
            throw new BusinessException("L'unite de ressource est obligatoire.");
        }
        if (assignment.getStartTime() == null || assignment.getEndTime() == null || !assignment.getEndTime().isAfter(assignment.getStartTime())) {
            throw new BusinessException("Le creneau horaire de l'affectation est invalide.");
        }
        if (assignment.getStatutReservation() == null || !ALLOWED_ASSIGNMENT_STATUSES.contains(assignment.getStatutReservation().trim().toUpperCase())) {
            throw new BusinessException("Le statut de l'affectation est invalide.");
        }

        Unite unite = uniteRepository.findById(assignment.getCibleId())
                .orElseThrow(() -> new ResourceNotFoundException("Unite introuvable: " + assignment.getCibleId()));

        if (unite.getStatut() == UniteStatut.EN_MAINTENANCE || unite.getStatut() == UniteStatut.EN_PANNE || unite.getStatut() == UniteStatut.HORS_SERVICE) {
            throw new BusinessException("L'unite " + unite.getCodeUnique() + " n'est pas disponible (statut: " + unite.getStatut().name() + ").");
        }

        if (isActiveAssignment(assignment) && isUniteOverlapping(assignment.getCibleId(), assignment.getStartTime(), assignment.getEndTime(), ownerType, ownerId)) {
            throw new BusinessException("Conflit horaire detecte pour l'unite " + unite.getCodeUnique() + ".");
        }
    }

    private Affectation normalizeAssignment(Affectation assignment) {
        Affectation norm = new Affectation();
        norm.setCibleId(assignment.getCibleId());
        norm.setStartTime(assignment.getStartTime());
        norm.setEndTime(assignment.getEndTime());
        norm.setStatutReservation(assignment.getStatutReservation() == null ? "PLANIFIEE" : assignment.getStatutReservation().trim().toUpperCase());
        return norm;
    }

    private void validateInternalOverlaps(List<Affectation> assignments) {
        List<Affectation> activeAssignments = assignments.stream()
                .map(this::normalizeAssignment)
                .filter(this::isActiveAssignment)
                .toList();

        for (int i = 0; i < activeAssignments.size(); i++) {
            for (int j = i + 1; j < activeAssignments.size(); j++) {
                Affectation first = activeAssignments.get(i);
                Affectation second = activeAssignments.get(j);
                if (first.getCibleId().equals(second.getCibleId())
                        && overlaps(first.getStartTime(), first.getEndTime(), second.getStartTime(), second.getEndTime())) {
                    throw new BusinessException("La meme unite ne peut pas etre affectee deux fois sur des creneaux qui se chevauchent.");
                }
            }
        }
    }

    private boolean isUniteOverlapping(String uniteId, LocalDateTime startTime, LocalDateTime endTime, String ownerType, String ownerId) {
        Criteria criteria = Criteria.where("affectations").elemMatch(
                Criteria.where("cibleId").is(uniteId)
                        .and("statutReservation").in(ACTIVE_ASSIGNMENT_STATUSES)
                        .and("startTime").lt(endTime.plusMinutes(30))
                        .and("endTime").gt(startTime.minusMinutes(30))
        );

        // Check collectes efficiently in MongoDB instead of RAM
        Query collecteQuery = new Query(criteria);
        if ("COLLECTE".equals(ownerType) && ownerId != null) {
            collecteQuery.addCriteria(Criteria.where("_id").ne(ownerId));
        }
        if (mongoTemplate.exists(collecteQuery, Collecte.class)) {
            return true;
        }

        // Check tournees efficiently in MongoDB instead of RAM
        Query tourneeQuery = new Query(criteria);
        if ("TOURNEE".equals(ownerType) && ownerId != null) {
            tourneeQuery.addCriteria(Criteria.where("_id").ne(ownerId));
        }
        return mongoTemplate.exists(tourneeQuery, Tournee.class);
    }

    private boolean isActiveAssignment(Affectation assignment) {
        return assignment != null
                && assignment.getStatutReservation() != null
                && ACTIVE_ASSIGNMENT_STATUSES.contains(assignment.getStatutReservation().trim().toUpperCase());
    }

    
    public void releaseUniteIfUnused(String uniteId) {
        if (uniteId == null || hasActiveAssignment(uniteId)) {
            return;
        }
        uniteRepository.findById(uniteId).ifPresent(unite -> {
            if (unite.getStatut() == UniteStatut.AFFECTE) {
                unite.setStatut(UniteStatut.DISPONIBLE);
                unite.setDisponibilite(true);
                uniteRepository.save(unite);
            }
        });
    }

    private boolean hasActiveAssignment(String uniteId) {
        Criteria criteria = Criteria.where("affectations").elemMatch(
                Criteria.where("cibleId").is(uniteId)
                        .and("statutReservation").in(ACTIVE_ASSIGNMENT_STATUSES)
        );
        return mongoTemplate.exists(new Query(criteria), Collecte.class) || 
               mongoTemplate.exists(new Query(criteria), Tournee.class);
    }

    private boolean overlaps(LocalDateTime firstStart, LocalDateTime firstEnd, LocalDateTime secondStart, LocalDateTime secondEnd) {
        // BUFFER DE TRAJET: 30 minutes de battement obligatoire entre deux affectations physiques.
        long bufferMinutes = 30;
        return firstStart.isBefore(secondEnd.plusMinutes(bufferMinutes)) && firstEnd.plusMinutes(bufferMinutes).isAfter(secondStart);
    }
}
