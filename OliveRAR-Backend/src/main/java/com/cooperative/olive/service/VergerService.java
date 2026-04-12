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

@Service
@RequiredArgsConstructor
public class VergerService {

    private final VergerRepository vergerRepository;
    private final AlertService alertService;

    public List<Verger> getAll() {
        return vergerRepository.findAll();
    }

    public PaginatedResponse<Verger> getAllPaginated(int page, int limit) {
        Pageable pageable = buildPageable(page, limit);
        Page<Verger> vergerPage = vergerRepository.findAll(pageable);
        return toPaginatedResponse(vergerPage, limit);
    }

    public List<Verger> getByAgriculteur(String agriculteurId) {
        return vergerRepository.findByAgriculteurId(agriculteurId);
    }

    public PaginatedResponse<Verger> getByAgriculteurPaginated(String agriculteurId, int page, int limit) {
        Pageable pageable = buildPageable(page, limit);
        Page<Verger> vergerPage = vergerRepository.findByAgriculteurId(agriculteurId, pageable);
        return toPaginatedResponse(vergerPage, limit);
    }

    public Verger getById(String id) {
        return vergerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Verger non trouvé"));
    }

    public Verger create(Verger verger) {
        Verger saved = vergerRepository.save(verger);
        // Envoyer notification si déjà prêt à la création
        if ("PRET_POUR_RECOLTE".equals(verger.getStatut())) {
            alertService.envoyerNotificationVergerPret(saved, saved.getAgriculteurId());
        }
        return saved;
    }

    public Verger update(String id, Verger updated) {
        Verger existing = getById(id);
        String ancienStatut = existing.getStatut();

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

        // Envoyer notification seulement si le statut CHANGE vers PRET_POUR_RECOLTE
        if ("PRET_POUR_RECOLTE".equals(updated.getStatut())
                && !"PRET_POUR_RECOLTE".equals(ancienStatut)) {
            alertService.envoyerNotificationVergerPret(saved, saved.getAgriculteurId());
        }
        // Si le statut QUITTE PRET_POUR_RECOLTE → supprimer les alertes
        if ("PRET_POUR_RECOLTE".equals(ancienStatut)
                && !"PRET_POUR_RECOLTE".equals(updated.getStatut())) {
            alertService.supprimerAlertesVerger(existing.getId());
        }

        return saved;
    }

    public void delete(String id) {
        vergerRepository.deleteById(id);
    }

    private Pageable buildPageable(int page, int limit) {
        int safePage = Math.max(page, 1);
        int safeLimit = 5;
        return PageRequest.of(safePage - 1, safeLimit, Sort.by(Sort.Direction.ASC, "nom"));
    }

    private PaginatedResponse<Verger> toPaginatedResponse(Page<Verger> vergerPage, int limit) {
        return new PaginatedResponse<>(
                vergerPage.getContent(),
                vergerPage.getTotalElements(),
                vergerPage.getTotalPages(),
                vergerPage.getNumber() + 1,
                5
        );
    }
}
