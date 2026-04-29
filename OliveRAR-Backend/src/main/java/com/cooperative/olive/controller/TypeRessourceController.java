package com.cooperative.olive.controller;

import com.cooperative.olive.entity.TypeRessource;
import com.cooperative.olive.service.TypeRessourceService;
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
 * Contrôleur REST pour la gestion des Types de Ressources logistiques.
 * Préfixe : /api/types-ressources
 */
@RestController
@RequestMapping("/api/types-ressources")
@RequiredArgsConstructor
public class TypeRessourceController {

    private final TypeRessourceService typeRessourceService;

    /** Liste paginée avec filtres (search, categorie, sousCategorie, actif). */
    @GetMapping
    public Map<String, Object> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "6") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String categorie,
            @RequestParam(required = false) String sousCategorie,
            @RequestParam(required = false) Boolean actif) {
        return typeRessourceService.getAll(page, size, search, categorie, sousCategorie, actif);
    }

    /** Détail d'un type. */
    @GetMapping("/{id}")
    public ApiResponse<TypeRessource> getById(@PathVariable String id) {
        return ApiResponse.success("Type de ressource récupéré.", typeRessourceService.getById(id));
    }

    /** Types actifs pour les dropdowns (filtres optionnels categorie / sousCategorie). */
    @GetMapping("/actifs")
    public ApiResponse<List<TypeRessource>> getActifs(
            @RequestParam(required = false) String categorie,
            @RequestParam(required = false) String sousCategorie) {
        return ApiResponse.success("Types actifs récupérés.",
                typeRessourceService.getActifs(categorie, sousCategorie));
    }

    /** Valeurs de l'enum RessourceCategorie pour l'UI. */
    @GetMapping("/categories")
    public ApiResponse<List<Map<String, String>>> getCategories() {
        return ApiResponse.success("Catégories récupérées.", typeRessourceService.getCategories());
    }

    @PostMapping
    public ApiResponse<TypeRessource> create(@RequestBody TypeRessource payload) {
        return ApiResponse.success("Type de ressource créé avec succès.", typeRessourceService.create(payload));
    }

    @PutMapping("/{id}")
    public ApiResponse<TypeRessource> update(@PathVariable String id, @RequestBody TypeRessource payload) {
        return ApiResponse.success("Type de ressource mis à jour.", typeRessourceService.update(id, payload));
    }

    /** Désactivation (soft-delete). */
    @PatchMapping("/{id}/desactiver")
    public ApiResponse<TypeRessource> desactiver(@PathVariable String id) {
        return ApiResponse.success("Type de ressource désactivé.", typeRessourceService.desactiver(id));
    }

    /** Suppression physique (uniquement si aucune unité rattachée). */
    @DeleteMapping("/{id}")
    public ApiResponse<Void> supprimer(@PathVariable String id) {
        typeRessourceService.supprimer(id);
        return ApiResponse.success("Type de ressource supprimé.");
    }
}
