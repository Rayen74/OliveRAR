package com.cooperative.olive.service;

import com.cooperative.olive.dao.AlertRepository;
import com.cooperative.olive.dao.UserRepository;
import com.cooperative.olive.entity.Alert;
import com.cooperative.olive.entity.User;
import com.cooperative.olive.entity.Verger;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertService {

    private final AlertRepository alertRepository;
    private final UserRepository userRepository;

    public void envoyerNotificationVergerPret(Verger verger, String agriculteurId) {

        // Récupérer l'agriculteur pour avoir son nom
        User agriculteur = userRepository.findById(agriculteurId).orElse(null);
        String nomComplet = agriculteur != null
                ? agriculteur.getPrenom() + " " + agriculteur.getNom()
                : "Agriculteur inconnu";

        String description = "🫒 Le verger '" + verger.getNom() + "' est prêt pour la récolte !";
        String timestamp = LocalDateTime.now().toString();

        // Créer l'alerte pour RESPONSABLE_LOGISTIQUE
        Alert alertLogistique = buildAlert(
                verger, agriculteurId, nomComplet,
                description, timestamp, "RESPONSABLE_LOGISTIQUE"
        );
        alertRepository.save(alertLogistique);
        log.info("Alert envoyée à RESPONSABLE_LOGISTIQUE pour verger: {}", verger.getNom());

        // Créer l'alerte pour RESPONSABLE_COOPERATIVE
        Alert alertCooperative = buildAlert(
                verger, agriculteurId, nomComplet,
                description, timestamp, "RESPONSABLE_COOPERATIVE"
        );
        alertRepository.save(alertCooperative);
        log.info("Alert envoyée à RESPONSABLE_COOPERATIVE pour verger: {}", verger.getNom());
    }

    private Alert buildAlert(Verger verger, String agriculteurId, String nomAgriculteur,
                             String description, String timestamp, String role) {
        Alert alert = new Alert();
        alert.setType("MATURITE_OLIVE");
        alert.setDescription(description);
        alert.setTimestamp(timestamp);

        // Détails verger
        alert.setVergerId(verger.getId());
        alert.setNomVerger(verger.getNom());
        alert.setLocalisationVerger(verger.getLocalisation());
        alert.setRendementEstime(verger.getRendementEstime());
        alert.setTypeOlive(verger.getTypeOlive());
        alert.setNombreArbres(verger.getNombreArbres());
        alert.setSuperficie(verger.getSuperficie());

        // Détails agriculteur
        alert.setAgriculteurId(agriculteurId);
        String[] parts = nomAgriculteur.split(" ", 2);
        alert.setPrenomAgriculteur(parts.length > 0 ? parts[0] : "");
        alert.setNomAgriculteur(parts.length > 1 ? parts[1] : "");

        alert.setDestinataireRole(role);
        alert.setLu(false);
        alert.setCreatedAt(LocalDateTime.now());
        return alert;
    }

    public List<Alert> getByRole(String role) {
        return alertRepository.findByDestinataireRole(role);
    }

    public List<Alert> getByVergerId(String vergerId) {
        return alertRepository.findByVergerId(vergerId);
    }

    public Alert marquerLu(String id) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Alert non trouvée"));
        alert.setLu(true);
        return alertRepository.save(alert);
    }
    public void supprimerAlertesVerger(String vergerId) {
        List<Alert> alerts = alertRepository.findByVergerId(vergerId);
        alertRepository.deleteAll(alerts);
        log.info("Alertes supprimées pour verger: {}", vergerId);
    }
}