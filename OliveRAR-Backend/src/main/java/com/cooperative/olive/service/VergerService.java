package com.cooperative.olive.service;

import com.cooperative.olive.controller.PaginatedResponse;
import com.cooperative.olive.dao.VergerRepository;
import com.cooperative.olive.entity.Role;
import com.cooperative.olive.entity.Verger;
import com.cooperative.olive.exception.BusinessException;
import com.cooperative.olive.exception.ResourceNotFoundException;
import com.cooperative.olive.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class VergerService {

    private static final Set<String> ALLOWED_STATUTS = Set.of(
            "EN_CROISSANCE",
            "PRET_POUR_RECOLTE"
    );

    private final VergerRepository vergerRepository;
    private final AlertService alertService;
    private final CurrentUserService currentUserService;

    public List<Verger> getAll() {
        return vergerRepository.findAll();
    }

    public List<Verger> getReadyVergers() {
        return vergerRepository.findByStatut("PRET_POUR_RECOLTE");
    }

    public PaginatedResponse<Verger> getAllPaginated(int page, int limit) {
        Pageable pageable = buildPageable(page, limit);
        Page<Verger> vergerPage = vergerRepository.findAll(pageable);
        return toPaginatedResponse(vergerPage);
    }

    public List<Verger> getByAgriculteur(String agriculteurId) {
        currentUserService.requireOwnerOrRole(agriculteurId, Role.RESPONSABLE_COOPERATIVE);
        return vergerRepository.findByAgriculteurId(agriculteurId);
    }

    public PaginatedResponse<Verger> getByAgriculteurPaginated(String agriculteurId, int page, int limit) {
        currentUserService.requireOwnerOrRole(agriculteurId, Role.RESPONSABLE_COOPERATIVE);
        Pageable pageable = buildPageable(page, limit);
        Page<Verger> vergerPage = vergerRepository.findByAgriculteurId(agriculteurId, pageable);
        return toPaginatedResponse(vergerPage);
    }

    public Verger getById(String id) {
        Verger verger = vergerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Verger non trouvé."));
        currentUserService.requireOwnerOrRole(verger.getAgriculteurId(), Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE);
        return verger;
    }

    public Verger create(Verger verger) {
        validateVergerFields(verger);
        applyOwnership(verger);
        checkDuplicateGeoLocalisation(verger, null);

        Verger saved = vergerRepository.save(verger);
        if ("PRET_POUR_RECOLTE".equals(verger.getStatut())) {
            alertService.envoyerNotificationVergerPret(saved, saved.getAgriculteurId());
        }
        return saved;
    }

    public Verger update(String id, Verger updated) {
        Verger existing = vergerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Verger non trouvé."));
        currentUserService.requireOwnerOrRole(existing.getAgriculteurId(), Role.RESPONSABLE_COOPERATIVE);

        String previousStatus = existing.getStatut();
        validateVergerFields(updated);
        updated.setAgriculteurId(existing.getAgriculteurId());
        checkDuplicateGeoLocalisation(updated, id);

        existing.setNom(updated.getNom());
        existing.setLocalisation(updated.getLocalisation());
        existing.setSuperficie(updated.getSuperficie());
        existing.setNombreArbres(updated.getNombreArbres());
        existing.setTypeOlive(updated.getTypeOlive());
        existing.setLatitude(updated.getLatitude());
        existing.setLongitude(updated.getLongitude());
        existing.setRendementEstime(updated.getRendementEstime());
        existing.setStatut(updated.getStatut());
        existing.setDateAlerteMaturite(updated.getDateAlerteMaturite());

        Verger saved = vergerRepository.save(existing);

        if ("PRET_POUR_RECOLTE".equals(updated.getStatut()) && !"PRET_POUR_RECOLTE".equals(previousStatus)) {
            alertService.envoyerNotificationVergerPret(saved, saved.getAgriculteurId());
        }
        if ("PRET_POUR_RECOLTE".equals(previousStatus) && !"PRET_POUR_RECOLTE".equals(updated.getStatut())) {
            alertService.supprimerAlertesVerger(existing.getId());
        }

        return saved;
    }

    public void delete(String id) {
        Verger existing = vergerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Verger non trouvé."));
        currentUserService.requireOwnerOrRole(existing.getAgriculteurId(), Role.RESPONSABLE_COOPERATIVE);
        vergerRepository.deleteById(id);
    }

    private void validateVergerFields(Verger verger) {
        if (verger.getSuperficie() <= 0) {
            throw new BusinessException("La superficie doit être un nombre décimal positif.");
        }
        if (verger.getNombreArbres() <= 0) {
            throw new BusinessException("Le nombre d'arbres doit être un entier positif.");
        }
        if (verger.getRendementEstime() <= 0) {
            throw new BusinessException("Le rendement estimé doit être un nombre décimal positif.");
        }
        if (verger.getStatut() == null || verger.getStatut().isBlank()) {
            throw new BusinessException("Le statut du verger est obligatoire.");
        }
        if (!ALLOWED_STATUTS.contains(verger.getStatut())) {
            throw new BusinessException("Statut invalide. Valeurs autorisées : EN_CROISSANCE, PRET_POUR_RECOLTE.");
        }
    }

    private void applyOwnership(Verger verger) {
        var currentUser = currentUserService.getRequiredCurrentUser();
        if (currentUser.getRole() == Role.AGRICULTEUR) {
            verger.setAgriculteurId(currentUser.getId());
            return;
        }

        if (currentUser.getRole() != Role.RESPONSABLE_COOPERATIVE) {
            throw new BusinessException("Action non autorisée.");
        }

        if (verger.getAgriculteurId() == null || verger.getAgriculteurId().isBlank()) {
            throw new BusinessException("L'agriculteur propriétaire est obligatoire.");
        }
    }

    private void checkDuplicateGeoLocalisation(Verger verger, String excludedId) {
        boolean localisationDuplicate;
        boolean coordsDuplicate;

        if (excludedId == null) {
            localisationDuplicate = verger.getLocalisation() != null
                    && !verger.getLocalisation().isBlank()
                    && vergerRepository.existsByLocalisationIgnoreCase(verger.getLocalisation());

            coordsDuplicate = (verger.getLatitude() != 0 || verger.getLongitude() != 0)
                    && vergerRepository.existsByLatitudeAndLongitude(
                    verger.getLatitude(), verger.getLongitude());
        } else {
            localisationDuplicate = verger.getLocalisation() != null
                    && !verger.getLocalisation().isBlank()
                    && vergerRepository.existsByLocalisationIgnoreCaseAndIdNot(
                    verger.getLocalisation(), excludedId);

            coordsDuplicate = (verger.getLatitude() != 0 || verger.getLongitude() != 0)
                    && vergerRepository.existsByLatitudeAndLongitudeAndIdNot(
                    verger.getLatitude(), verger.getLongitude(), excludedId);
        }

        if (localisationDuplicate) {
            throw new BusinessException("Un verger avec la même localisation/adresse existe déjà.");
        }
        if (coordsDuplicate) {
            throw new BusinessException("Un verger avec les mêmes coordonnées géographiques existe déjà.");
        }
    }

    private Pageable buildPageable(int page, int limit) {
        int safePage = Math.max(page, 1);
        int safeLimit = limit <= 0 ? 5 : Math.min(limit, 50);
        return PageRequest.of(safePage - 1, safeLimit, Sort.by(Sort.Direction.ASC, "nom"));
    }

    private PaginatedResponse<Verger> toPaginatedResponse(Page<Verger> vergerPage) {
        return new PaginatedResponse<>(
                vergerPage.getContent(),
                vergerPage.getTotalElements(),
                vergerPage.getTotalPages(),
                vergerPage.getNumber() + 1,
                vergerPage.getSize()
        );
    }
}
