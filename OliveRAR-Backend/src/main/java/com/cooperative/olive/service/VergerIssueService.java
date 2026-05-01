package com.cooperative.olive.service;

import com.cooperative.olive.dao.VergerRepository;
import com.cooperative.olive.entity.Role;
import com.cooperative.olive.entity.VergerIssue;
import com.cooperative.olive.exception.BusinessException;
import com.cooperative.olive.exception.ResourceNotFoundException;
import com.cooperative.olive.repository.VergerIssueRepository;
import com.cooperative.olive.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VergerIssueService {

    private final VergerIssueRepository vergerIssueRepository;
    private final VergerRepository vergerRepository;
    private final CurrentUserService currentUserService;

    public List<VergerIssue> getAll(String vergerId, String statut, String type, String gravite) {
        // Simple filtering logic
        return vergerIssueRepository.findByDeletedFalse().stream()
                .filter(i -> vergerId == null || i.getVergerId().equals(vergerId))
                .filter(i -> statut == null || i.getStatut().equals(statut))
                .filter(i -> type == null || i.getType().equals(type))
                .filter(i -> gravite == null || i.getGravite().equals(gravite))
                .collect(Collectors.toList());
    }

    public VergerIssue getById(String id) {
        VergerIssue issue = vergerIssueRepository.findById(id)
                .filter(i -> !i.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Signalement non trouvé."));
        return issue;
    }

    public VergerIssue create(VergerIssue issue) {
        if (!vergerRepository.existsById(issue.getVergerId())) {
            throw new BusinessException("Le verger spécifié n'existe pas.");
        }

        var currentUser = currentUserService.getRequiredCurrentUser();
        
        issue.setStatut("SIGNALE");
        issue.setDateSignalement(LocalDateTime.now());
        issue.setSignalePar(currentUser.getId());
        issue.setHistorique(new ArrayList<>());
        issue.setDeleted(false);

        // Add initial history
        issue.getHistorique().add(VergerIssue.HistoriqueIssue.builder()
                .date(LocalDateTime.now())
                .action("CRÉATION")
                .nouveauStatut("SIGNALE")
                .userId(currentUser.getId())
                .build());

        return vergerIssueRepository.save(issue);
    }

    public VergerIssue update(String id, VergerIssue updated) {
        VergerIssue existing = getById(id);
        var currentUser = currentUserService.getRequiredCurrentUser();

        // Only manager can change status or edit others' reports
        // If it's an agriculteur, they can only edit if they are the creator AND it's still in SIGNALE? 
        // Let's keep it simple: Managers can do everything, Agriculteurs can create and view.
        
        boolean isManager = currentUser.getRole() == Role.RESPONSABLE_COOPERATIVE || currentUser.getRole() == Role.RESPONSABLE_LOGISTIQUE;
        
        if (!isManager && !existing.getSignalePar().equals(currentUser.getId())) {
            throw new BusinessException("Vous n'êtes pas autorisé à modifier ce signalement.");
        }

        if (!existing.getStatut().equals(updated.getStatut())) {
            if (!isManager) {
                throw new BusinessException("Seul un responsable peut changer le statut d'un signalement.");
            }
            
            // Validate transition
            validateTransition(existing.getStatut(), updated.getStatut());

            existing.getHistorique().add(VergerIssue.HistoriqueIssue.builder()
                    .date(LocalDateTime.now())
                    .action("CHANGEMENT_STATUT")
                    .ancienStatut(existing.getStatut())
                    .nouveauStatut(updated.getStatut())
                    .userId(currentUser.getId())
                    .build());
            
            existing.setStatut(updated.getStatut());
        }

        existing.setDescription(updated.getDescription());
        existing.setType(updated.getType());
        existing.setGravite(updated.getGravite());
        existing.setNotes(updated.getNotes());
        if (updated.getPhotos() != null) {
            existing.setPhotos(updated.getPhotos());
        }

        return vergerIssueRepository.save(existing);
    }

    public void delete(String id) {
        VergerIssue existing = getById(id);
        var currentUser = currentUserService.getRequiredCurrentUser();
        
        boolean isManager = currentUser.getRole() == Role.RESPONSABLE_COOPERATIVE || currentUser.getRole() == Role.RESPONSABLE_LOGISTIQUE;
        
        if (!isManager && !existing.getSignalePar().equals(currentUser.getId())) {
            throw new BusinessException("Vous n'êtes pas autorisé à supprimer ce signalement.");
        }

        existing.setDeleted(true);
        vergerIssueRepository.save(existing);
    }

    private void validateTransition(String oldStatut, String newStatut) {
        // SIGNALE -> EN_COURS -> RESOLU
        if (oldStatut.equals("SIGNALE") && !newStatut.equals("EN_COURS") && !newStatut.equals("RESOLU")) {
            throw new BusinessException("Transition invalide depuis SIGNALE.");
        }
        if (oldStatut.equals("EN_COURS") && !newStatut.equals("RESOLU") && !newStatut.equals("SIGNALE")) {
            throw new BusinessException("Transition invalide depuis EN_COURS.");
        }
        if (oldStatut.equals("RESOLU") && !newStatut.equals("EN_COURS")) {
            throw new BusinessException("Un signalement RÉSOLU ne peut être que réouvert en EN_COURS.");
        }
    }
}
