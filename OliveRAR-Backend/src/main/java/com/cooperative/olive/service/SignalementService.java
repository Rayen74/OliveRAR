package com.cooperative.olive.service;

import com.cooperative.olive.dao.SignalementRepository;
import com.cooperative.olive.dao.VergerRepository;
import com.cooperative.olive.entity.ActiviteType;
import com.cooperative.olive.entity.Role;
import com.cooperative.olive.entity.Signalement;
import com.cooperative.olive.entity.Verger;
import com.cooperative.olive.exception.BusinessException;
import com.cooperative.olive.exception.ResourceNotFoundException;
import com.cooperative.olive.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SignalementService {

    private final SignalementRepository signalementRepository;
    private final VergerRepository vergerRepository;
    private final CurrentUserService currentUserService;
    private final ActiviteService activiteService;

    public List<Signalement> getMine() {
        String currentUserId = currentUserService.getRequiredCurrentUser().getId();
        return signalementRepository.findByCreatedByOrderByCreatedAtDesc(currentUserId);
    }

    public List<Signalement> getByVerger(String vergerId) {
        Verger verger = vergerRepository.findById(vergerId)
                .orElseThrow(() -> new ResourceNotFoundException("Verger introuvable."));
        currentUserService.requireOwnerOrRole(verger.getAgriculteurId(), Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE);
        return signalementRepository.findByVergerIdOrderByCreatedAtDesc(vergerId);
    }

    public Signalement create(Signalement signalement) {
        currentUserService.requireRole(Role.AGRICULTEUR, Role.RESPONSABLE_COOPERATIVE);

        Verger verger = vergerRepository.findById(signalement.getVergerId())
                .orElseThrow(() -> new ResourceNotFoundException("Verger introuvable."));

        String currentUserId = currentUserService.getRequiredCurrentUser().getId();
        currentUserService.requireOwnerOrRole(verger.getAgriculteurId(), Role.RESPONSABLE_COOPERATIVE);

        signalement.setId(null);
        signalement.setCreatedBy(currentUserId);
        signalement.setStatus("NOUVEAU");
        signalement.setCreatedAt(LocalDateTime.now());
        signalement.setUpdatedAt(LocalDateTime.now());
        signalement.getHistory().add("Signalement créé le " + LocalDateTime.now());
        Signalement saved = signalementRepository.save(signalement);

        activiteService.enregistrerPourUtilisateurCourant(
                ActiviteType.ALERTE_CREEE, "ALERTE",
                "Alerte créée pour le verger \"" + verger.getNom() + "\".",
                saved.getId(), "Alerte " + saved.getIssueType(),
                java.util.Map.of("verger", verger.getNom(), "type", saved.getIssueType()));

        return saved;
    }

    public Signalement updateStatus(String id, String status) {
        currentUserService.requireRole(Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE, Role.RESPONSABLE_CHEF_RECOLTE);

        Signalement signalement = signalementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Signalement introuvable."));

        if (status == null || status.isBlank()) {
            throw new BusinessException("Le statut est obligatoire.");
        }

        signalement.setStatus(status);
        signalement.setUpdatedAt(LocalDateTime.now());
        signalement.getHistory().add("Statut mis à jour vers " + status + " le " + LocalDateTime.now());
        Signalement saved = signalementRepository.save(signalement);

        activiteService.enregistrerPourUtilisateurCourant(
                ActiviteType.ALERTE_STATUT_CHANGE, "ALERTE",
                "Statut de l'alerte changé vers : " + status,
                saved.getId(), "Alerte " + saved.getIssueType(),
                java.util.Map.of("nouveauStatut", status));

        return saved;
    }
}
