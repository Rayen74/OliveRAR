package com.cooperative.olive.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Type de ressource logistique (catalogue).
 * Collection : typesRessources
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "typesRessources")
public class TypeRessource {

    @Id
    private String id;

    /** Nom du type, ex: "Camion SCANIA 25T" */
    private String nom;

    /** Catégorie principale (enum Java) */
    private RessourceCategorie categorie;

    /**
     * Sous-catégorie libre : "VEHICULE", "TRACTEUR",
     * "OUTIL_MECANIQUE", "OUTIL_MANUEL", "ACCESSOIRE"…
     */
    private String sousCategorie;

    private String description;

    /** Capacité nominale de l'unité de ce type */
    private Capacite capacite;

    /** Indique si ce type est encore actif (soft-delete) */
    private boolean actif = true;

    /** POJO embedded pour la capacité */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Capacite {
        private Double valeur;
        /** ex: "tonnes", "m³", "unité" */
        private String unite;
    }
}
