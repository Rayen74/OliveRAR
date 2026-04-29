package com.cooperative.olive.entity;

/**
 * Statuts possibles d'une unité réelle de ressource.
 * Transitions autorisées (machine d'états) :
 *
 * DISPONIBLE   → AFFECTE, EN_MAINTENANCE, RESERVE
 * AFFECTE      → DISPONIBLE, EN_PANNE, HORS_SERVICE
 * EN_MAINTENANCE → DISPONIBLE, HORS_SERVICE
 * EN_PANNE     → EN_MAINTENANCE, HORS_SERVICE
 * EN_PANNE     → EN_MAINTENANCE, HORS_SERVICE
 * HORS_SERVICE → (terminal – aucune transition autorisée)
 */
public enum UniteStatut {

    DISPONIBLE,
    AFFECTE,
    EN_MAINTENANCE,
    EN_PANNE,
    HORS_SERVICE;

    /** Libellé français affiché dans l'UI. */
    public String libelle() {
        return switch (this) {
            case DISPONIBLE    -> "Disponible";
            case AFFECTE       -> "Affecté";
            case EN_MAINTENANCE -> "En maintenance";
            case EN_PANNE      -> "En panne";
            case HORS_SERVICE  -> "Hors service";
        };
    }

    /**
     * Vérifie si la transition vers {@code cible} est autorisée.
     *
     * @param cible statut cible
     * @return true si la transition est valide
     */
    public boolean peutTransitionnerVers(UniteStatut cible) {
        return switch (this) {
            case DISPONIBLE    -> cible == AFFECTE || cible == EN_MAINTENANCE;
            case AFFECTE       -> cible == DISPONIBLE || cible == EN_PANNE || cible == HORS_SERVICE;
            case EN_MAINTENANCE -> cible == DISPONIBLE || cible == HORS_SERVICE;
            case EN_PANNE      -> cible == EN_MAINTENANCE || cible == HORS_SERVICE;
            case HORS_SERVICE  -> false;
        };
    }
}
