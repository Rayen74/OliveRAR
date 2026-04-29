package com.cooperative.olive.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Unité réelle d'une ressource (instance physique d'un TypeRessource).
 * Collection : unites
 *
 * L'historique est embedded (append-only, jamais modifié).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "unites")
public class Unite {

    @Id
    private String id;

    /** Code unique d'identification physique, ex: "CAM-001" */
    @Indexed(unique = true)
    private String codeUnique;

    /** Référence au TypeRessource */
    private String typeId;

    /** Statut courant (machine d'états définie dans UniteStatut) */
    private UniteStatut statut = UniteStatut.DISPONIBLE;

    /** Raccourci calculé depuis le statut */
    private boolean disponibilite = true;

    /** Localisation physique courante */
    private String localisation;

    /** Date de la dernière maintenance effectuée */
    private LocalDate derniereMaintenanceDate;

    /**
     * true si (Date.now – derniereMaintenanceDate) > seuilMaintenanceJours
     * Calculé à l'écriture par le service.
     */
    private boolean alerteMaintenanceActive = false;

    /**
     * Seuil en jours avant d'activer l'alerte maintenance.
     * Valeur par défaut : 180 jours.
     */
    private int seuilMaintenanceJours = 180;

    /** Conducteur habituel (optionnel) */
    private String conducteurHabituelId;

    private String notes;

    /** Historique append-only des actions */
    private List<HistoriqueEntree> historique = new ArrayList<>();

    // ─────────────────────────────────────────────
    // Embedded: entrée d'historique
    // ─────────────────────────────────────────────

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HistoriqueEntree {

        private LocalDateTime date;

        /**
         * Type d'action : "CHANGEMENT_STATUT", "AFFECTATION",
         * "MAINTENANCE", "CREATION", "DESACTIVATION"…
         */
        private String action;

        /** Valeur du statut au moment de l'action */
        private String statut;

        private String note;

        /** ID de l'utilisateur extrait du JWT par CurrentUserService */
        private String auteurId;
    }
}
