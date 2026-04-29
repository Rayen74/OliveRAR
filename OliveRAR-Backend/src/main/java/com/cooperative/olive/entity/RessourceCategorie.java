package com.cooperative.olive.entity;

/**
 * Catégorie principale d'une ressource logistique.
 * Hiérarchie : MATERIEL_ROULANT > EQUIPEMENT > AUTRE
 */
public enum RessourceCategorie {

    /** Véhicules et engins de transport (camions, tracteurs, bennes…) */
    MATERIEL_ROULANT,

    /** Outillage mécanique ou manuel, accessoires de récolte */
    EQUIPEMENT,

    /** Toute ressource ne rentrant pas dans les deux catégories précédentes */
    AUTRE;

    /** Retourne le libellé affiché en français. */
    public String libelle() {
        return switch (this) {
            case MATERIEL_ROULANT -> "Matériel roulant";
            case EQUIPEMENT       -> "Équipement";
            case AUTRE            -> "Autre";
        };
    }
}
