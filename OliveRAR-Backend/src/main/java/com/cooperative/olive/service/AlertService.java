package com.cooperative.olive.service;

import com.cooperative.olive.dao.AlertRepository;
import com.cooperative.olive.dao.UserRepository;
import com.cooperative.olive.entity.Alert;
import com.cooperative.olive.entity.Post;
import com.cooperative.olive.entity.User;
import com.cooperative.olive.entity.Verger;
import com.cooperative.olive.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertService {

    private final AlertRepository alertRepository;
    private final UserRepository userRepository;
    private final MongoTemplate mongoTemplate;

    public void envoyerNotificationVergerPret(Verger verger, String agriculteurId) {
        User agriculteur = userRepository.findById(agriculteurId).orElse(null);
        String nomComplet = agriculteur != null
                ? agriculteur.getPrenom() + " " + agriculteur.getNom()
                : "Agriculteur inconnu";

        String description = "Le verger '" + verger.getNom() + "' est pret pour la recolte.";

        upsertAlert(verger, agriculteurId, nomComplet, description, "RESPONSABLE_LOGISTIQUE");
        upsertAlert(verger, agriculteurId, nomComplet, description, "RESPONSABLE_COOPERATIVE");
    }

    private void upsertAlert(Verger verger, String agriculteurId, String nomAgriculteur,
            String description, String role) {
        Alert alert = alertRepository
                .findFirstByVergerIdAndDestinataireRole(verger.getId(), role)
                .orElseGet(Alert::new);

        String timestamp = LocalDateTime.now().toString();

        alert.setType("MATURITE_OLIVE");
        alert.setDescription(description);
        alert.setTimestamp(timestamp);
        alert.setVergerId(verger.getId());
        alert.setNomVerger(verger.getNom());
        alert.setLocalisationVerger(verger.getLocalisation());
        alert.setRendementEstime(verger.getRendementEstime());
        alert.setTypeOlive(verger.getTypeOlive());
        alert.setNombreArbres(verger.getNombreArbres());
        alert.setSuperficie(verger.getSuperficie());
        alert.setAgriculteurId(agriculteurId);

        String[] parts = nomAgriculteur.split(" ", 2);
        alert.setPrenomAgriculteur(parts.length > 0 ? parts[0] : "");
        alert.setNomAgriculteur(parts.length > 1 ? parts[1] : "");

        alert.setDestinataireRole(role);
        alert.setLu(false);
        alert.setCreatedAt(LocalDateTime.now());

        alertRepository.save(alert);
        log.info("Alerte synchronisee pour {} sur verger: {}", role, verger.getNom());
    }

    public List<Alert> getByRole(String role) {
        return alertRepository.findByDestinataireRole(role);
    }

    public List<Alert> getByVergerId(String vergerId) {
        return alertRepository.findByVergerId(vergerId);
    }

    public Alert marquerLu(String id) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Alerte introuvable."));
        alert.setLu(true);
        return alertRepository.save(alert);
    }

    public void supprimerAlertesVerger(String vergerId) {
        List<Alert> alerts = alertRepository.findByVergerId(vergerId);
        alertRepository.deleteAll(alerts);
        log.info("Alertes supprimees pour verger: {}", vergerId);
    }

    public void envoyerNotificationCommentaire(Post post, String nomCommentateur) {
        String description = nomCommentateur + " a commenté votre post : \"" + post.getTitre() + "\"";

        Query query = new Query(
                Criteria.where("postId").is(post.getId())
                        .and("destinataireRole").is("NOTIF_COMMENTAIRE_" + post.getAgriculteurId()));

        Update update = new Update()
                .set("type", "COMMENTAIRE")
                .set("description", description)
                .set("timestamp", LocalDateTime.now().toString())
                .set("postId", post.getId())
                .set("destinataireRole", "AGRICULTEUR")
                .set("agriculteurId", post.getAgriculteurId())
                .set("lu", false)
                .setOnInsert("createdAt", LocalDateTime.now());

        mongoTemplate.upsert(query, update, Alert.class);
    }
}
