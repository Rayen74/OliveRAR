package com.cooperative.olive.controller;

import com.cooperative.olive.entity.Unite;
import com.cooperative.olive.service.UniteService;
import com.cooperative.olive.util.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Contrôleur REST pour la gestion des Unités réelles de ressources.
 * Préfixe : /api/unites
 */
@RestController
@RequestMapping("/api/unites")
@RequiredArgsConstructor
public class UniteController {

    private final UniteService uniteService;

    /** Liste paginée avec filtres (search, statut, typeId, disponible). */
    @GetMapping
    public Map<String, Object> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "6") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String statut,
            @RequestParam(required = false) String typeId,
            @RequestParam(required = false) Boolean disponible) {
        return uniteService.getAll(page, size, search, statut, typeId, disponible);
    }

    /** Détail d'une unité (avec historique). */
    @GetMapping("/{id}")
    public ApiResponse<Map<String, Object>> getById(@PathVariable String id) {
        return ApiResponse.success("Unité récupérée.", uniteService.getById(id));
    }

    /**
     * Unités disponibles pour les dropdowns d'affectation.
     * Filtres optionnels : typeId, categorie, sousCategorie.
     */
    @GetMapping("/disponibles")
    public ApiResponse<List<Map<String, Object>>> getDisponibles(
            @RequestParam(required = false) String typeId,
            @RequestParam(required = false) String categorie,
            @RequestParam(required = false) String sousCategorie) {
        return ApiResponse.success("Unités disponibles récupérées.",
                uniteService.getDisponibles(typeId, categorie, sousCategorie));
    }

    /** Valeurs de l'enum UniteStatut pour l'UI. */
    @GetMapping("/statuts")
    public ApiResponse<List<Map<String, String>>> getStatuts() {
        return ApiResponse.success("Statuts récupérés.", uniteService.getStatuts());
    }

    /** Création d'une seule unité. */
    @PostMapping
    public ApiResponse<Unite> creer(@RequestBody Unite payload) {
        return ApiResponse.success("Unité créée avec succès.", uniteService.creer(payload));
    }

    /**
     * Multi-création d'unités avec codes auto-incrémentés.
     *
     * Body : { typeId, prefixCode, debut, nombre, template? }
     */
    @PostMapping("/multi")
    public ApiResponse<List<Unite>> creerMultiple(@RequestBody Map<String, Object> body) {
        String typeId = (String) body.get("typeId");
        String prefixCode = (String) body.get("prefixCode");
        int debut = body.containsKey("debut") ? ((Number) body.get("debut")).intValue() : 1;
        int nombre = body.containsKey("nombre") ? ((Number) body.get("nombre")).intValue() : 1;

        // Le template est optionnel – on passe null si absent
        Unite template = null;
        return ApiResponse.success(
                nombre + " unité(s) créée(s) avec succès.",
                uniteService.creerMultiple(typeId, prefixCode, debut, nombre, template));
    }

    @PutMapping("/{id}")
    public ApiResponse<Unite> modifier(@PathVariable String id, @RequestBody Unite payload) {
        return ApiResponse.success("Unité mise à jour.", uniteService.modifier(id, payload));
    }

    /**
     * Changement de statut (machine d'états).
     * Body : { statut: "EN_MAINTENANCE", note: "..." }
     */
    @PatchMapping("/{id}/statut")
    public ApiResponse<Unite> changerStatut(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        return ApiResponse.success("Statut mis à jour.",
                uniteService.changerStatut(id, body.get("statut"), body.get("note")));
    }

    /**
     * Désactivation (soft-delete → HORS_SERVICE).
     * Body optionnel : { note: "..." }
     */
    @PatchMapping("/{id}/desactiver")
    public ApiResponse<Unite> desactiver(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        String note = body != null ? body.get("note") : null;
        return ApiResponse.success("Unité désactivée.", uniteService.desactiver(id, note));
    }

    /** Suppression physique (uniquement si HORS_SERVICE). */
    @DeleteMapping("/{id}")
    public ApiResponse<Void> supprimer(@PathVariable String id) {
        uniteService.supprimer(id);
        return ApiResponse.success("Unité supprimée.");
    }
}
