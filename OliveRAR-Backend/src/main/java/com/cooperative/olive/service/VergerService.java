package com.cooperative.olive.service;

import com.cooperative.olive.dao.VergerRepository;
import com.cooperative.olive.controller.PaginatedResponse;
import com.cooperative.olive.entity.Verger;
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

    private final VergerRepository vergerRepository;
    private final AlertService alertService;

    /** Allowed statut values (internal codes). */
    private static final Set<String> ALLOWED_STATUTS = Set.of(
            "EN_CROISSANCE",
            "PRET_POUR_RECOLTE"
    );

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
        return vergerRepository.findByAgriculteurId(agriculteurId);
    }

    public PaginatedResponse<Verger> getByAgriculteurPaginated(String agriculteurId, int page, int limit) {
        Pageable pageable = buildPageable(page, limit);
        Page<Verger> vergerPage = vergerRepository.findByAgriculteurId(agriculteurId, pageable);
        return toPaginatedResponse(vergerPage);
    }

    public Verger getById(String id) {
        return vergerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Verger non trouvé"));
    }

    public Verger create(Verger verger) {
        validateVergerFields(verger);
        checkDuplicateGeoLocalisation(verger, null);

        Verger saved = vergerRepository.save(verger);
        // Send notification if already ready at creation
        if ("PRET_POUR_RECOLTE".equals(verger.getStatut())) {
            alertService.envoyerNotificationVergerPret(saved, saved.getAgriculteurId());
        }
        return saved;
    }

    public Verger update(String id, Verger updated) {
        Verger existing = getById(id);
        String ancienStatut = existing.getStatut();

        validateVergerFields(updated);
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

        // Send notification only if statut CHANGES to PRET_POUR_RECOLTE
        if ("PRET_POUR_RECOLTE".equals(updated.getStatut())
                && !"PRET_POUR_RECOLTE".equals(ancienStatut)) {
            alertService.envoyerNotificationVergerPret(saved, saved.getAgriculteurId());
        }
        // If statut LEAVES PRET_POUR_RECOLTE → delete alerts
        if ("PRET_POUR_RECOLTE".equals(ancienStatut)
                && !"PRET_POUR_RECOLTE".equals(updated.getStatut())) {
            alertService.supprimerAlertesVerger(existing.getId());
        }

        return saved;
    }

    public void delete(String id) {
        vergerRepository.deleteById(id);
    }

    // ------------------------------------------------------------------ //
    //  VALIDATION
    // ------------------------------------------------------------------ //

    private void validateVergerFields(Verger verger) {
        // superficie: positive decimal
        if (verger.getSuperficie() <= 0) {
            throw new RuntimeException("La superficie doit être un nombre décimal positif.");
        }
        // nombreArbres: positive integer (> 0, no decimals)
        if (verger.getNombreArbres() <= 0) {
            throw new RuntimeException("Le nombre d'arbres doit être un entier positif.");
        }
        // rendement: positive decimal
        if (verger.getRendementEstime() <= 0) {
            throw new RuntimeException("Le rendement estimé doit être un nombre décimal positif.");
        }
        // statut whitelist
        if (verger.getStatut() == null || verger.getStatut().isBlank()) {
            throw new RuntimeException("Le statut du verger est obligatoire.");
        }
        if (!ALLOWED_STATUTS.contains(verger.getStatut())) {
            throw new RuntimeException(
                "Statut invalide. Valeurs autorisées : Prêt pour collecte, En croissance."
            );
        }
    }

    private void checkDuplicateGeoLocalisation(Verger verger, String excludedId) {
        boolean localisationDuplicate;
        boolean coordsDuplicate;

        if (excludedId == null) {
            // Create: check all records
            localisationDuplicate = verger.getLocalisation() != null
                    && !verger.getLocalisation().isBlank()
                    && vergerRepository.existsByLocalisation(verger.getLocalisation());

            coordsDuplicate = (verger.getLatitude() != 0 || verger.getLongitude() != 0)
                    && vergerRepository.existsByLatitudeAndLongitude(
                            verger.getLatitude(), verger.getLongitude());
        } else {
            // Update: exclude self
            localisationDuplicate = verger.getLocalisation() != null
                    && !verger.getLocalisation().isBlank()
                    && vergerRepository.existsByLocalisationAndIdNot(
                            verger.getLocalisation(), excludedId);

            coordsDuplicate = (verger.getLatitude() != 0 || verger.getLongitude() != 0)
                    && vergerRepository.existsByLatitudeAndLongitudeAndIdNot(
                            verger.getLatitude(), verger.getLongitude(), excludedId);
        }

        if (localisationDuplicate) {
            throw new RuntimeException(
                "Un verger avec la même localisation/adresse existe déjà."
            );
        }
        if (coordsDuplicate) {
            throw new RuntimeException(
                "Un verger avec les mêmes coordonnées géographiques existe déjà."
            );
        }
    }

    // ------------------------------------------------------------------ //
    //  HELPERS
    // ------------------------------------------------------------------ //

    private Pageable buildPageable(int page, int limit) {
        int safePage = Math.max(page, 1);
        return PageRequest.of(safePage - 1, 5, Sort.by(Sort.Direction.ASC, "nom"));
    }

    private PaginatedResponse<Verger> toPaginatedResponse(Page<Verger> vergerPage) {
        return new PaginatedResponse<>(
                vergerPage.getContent(),
                vergerPage.getTotalElements(),
                vergerPage.getTotalPages(),
                vergerPage.getNumber() + 1,
                5
        );
    }
}
