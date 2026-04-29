package com.cooperative.olive.service;

import com.cooperative.olive.dao.TypeRessourceRepository;
import com.cooperative.olive.dao.UniteRepository;
import com.cooperative.olive.entity.RessourceCategorie;
import com.cooperative.olive.entity.Role;
import com.cooperative.olive.entity.TypeRessource;
import com.cooperative.olive.exception.BusinessException;
import com.cooperative.olive.exception.ResourceNotFoundException;
import com.cooperative.olive.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Service métier pour les Types de Ressources.
 * Réutilise les patterns de pagination, recherche et rôle du reste du projet.
 */
@Service
@RequiredArgsConstructor
public class TypeRessourceService {

    private final TypeRessourceRepository typeRessourceRepository;
    private final UniteRepository uniteRepository;
    private final MongoTemplate mongoTemplate;
    private final CurrentUserService currentUserService;

    // ─────────────────────────────────────────────────────────────
    // READ
    // ─────────────────────────────────────────────────────────────

    public Map<String, Object> getAll(int page, int size, String search,
                                       String categorie, String sousCategorie,
                                       Boolean actif) {
        currentUserService.requireRole(
                Role.RESPONSABLE_LOGISTIQUE, Role.RESPONSABLE_COOPERATIVE);

        int safePage = Math.max(page, 0);
        int safeSize = size <= 0 ? 6 : Math.min(size, 50);

        Query query = new Query();

        if (search != null && !search.isBlank()) {
            query.addCriteria(Criteria.where("nom")
                    .regex(".*" + java.util.regex.Pattern.quote(search.trim()) + ".*", "i"));
        }
        if (categorie != null && !categorie.isBlank()) {
            try {
                query.addCriteria(Criteria.where("categorie")
                        .is(RessourceCategorie.valueOf(categorie.trim().toUpperCase())));
            } catch (IllegalArgumentException ignored) {
                throw new BusinessException("Catégorie invalide : " + categorie);
            }
        }
        if (sousCategorie != null && !sousCategorie.isBlank()) {
            query.addCriteria(Criteria.where("sousCategorie")
                    .regex(".*" + java.util.regex.Pattern.quote(sousCategorie.trim()) + ".*", "i"));
        }
        if (actif != null) {
            query.addCriteria(Criteria.where("actif").is(actif));
        }

        long totalElements = mongoTemplate.count(query, TypeRessource.class);
        int totalPages = Math.max(1, (int) Math.ceil((double) totalElements / safeSize));
        query.with(PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.ASC, "nom")));

        List<TypeRessource> items = mongoTemplate.find(query, TypeRessource.class);

        return Map.of(
                "success", true,
                "items", items,
                "page", safePage,
                "size", safeSize,
                "totalElements", totalElements,
                "totalPages", totalPages
        );
    }

    public TypeRessource getById(String id) {
        currentUserService.requireRole(
                Role.RESPONSABLE_LOGISTIQUE, Role.RESPONSABLE_COOPERATIVE);
        return typeRessourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Type de ressource introuvable."));
    }

    /** Retourne les types actifs, filtrés par catégorie et sous-catégorie pour les dropdowns. */
    public List<TypeRessource> getActifs(String categorie, String sousCategorie) {
        currentUserService.requireRole(
                Role.RESPONSABLE_LOGISTIQUE, Role.RESPONSABLE_COOPERATIVE,
                Role.RESPONSABLE_CHEF_RECOLTE);

        Query query = new Query(Criteria.where("actif").is(true));
        if (categorie != null && !categorie.isBlank()) {
            try {
                query.addCriteria(Criteria.where("categorie")
                        .is(RessourceCategorie.valueOf(categorie.trim().toUpperCase())));
            } catch (IllegalArgumentException ignored) {
                // filtre ignoré si valeur invalide
            }
        }
        if (sousCategorie != null && !sousCategorie.isBlank()) {
            query.addCriteria(Criteria.where("sousCategorie").is(sousCategorie.trim().toUpperCase()));
        }
        return mongoTemplate.find(query, TypeRessource.class);
    }

    /** Expose les valeurs de l'enum RessourceCategorie pour l'UI. */
    public List<Map<String, String>> getCategories() {
        return Arrays.stream(RessourceCategorie.values())
                .map(c -> Map.of("value", c.name(), "libelle", c.libelle()))
                .toList();
    }

    // ─────────────────────────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────────────────────────

    public TypeRessource create(TypeRessource payload) {
        currentUserService.requireRole(
                Role.RESPONSABLE_LOGISTIQUE, Role.RESPONSABLE_COOPERATIVE);
        valider(payload, null);

        payload.setId(null);
        payload.setActif(true);
        return typeRessourceRepository.save(payload);
    }

    // ─────────────────────────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────────────────────────

    public TypeRessource update(String id, TypeRessource payload) {
        currentUserService.requireRole(
                Role.RESPONSABLE_LOGISTIQUE, Role.RESPONSABLE_COOPERATIVE);

        TypeRessource existing = typeRessourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Type de ressource introuvable."));

        valider(payload, id);

        existing.setNom(payload.getNom().trim());
        existing.setCategorie(payload.getCategorie());
        existing.setSousCategorie(normaliseSousCategorie(payload.getSousCategorie()));
        existing.setDescription(payload.getDescription());
        existing.setCapacite(payload.getCapacite());
        existing.setActif(payload.isActif());
        return typeRessourceRepository.save(existing);
    }

    // ─────────────────────────────────────────────────────────────
    // SOFT-DELETE (désactivation)
    // ─────────────────────────────────────────────────────────────

    public TypeRessource desactiver(String id) {
        currentUserService.requireRole(
                Role.RESPONSABLE_LOGISTIQUE, Role.RESPONSABLE_COOPERATIVE);

        TypeRessource existing = typeRessourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Type de ressource introuvable."));

        long unitesActives = uniteRepository.findByTypeId(id).stream()
                .filter(u -> u.getStatut() != com.cooperative.olive.entity.UniteStatut.HORS_SERVICE)
                .count();

        if (unitesActives > 0) {
            throw new BusinessException(
                    "Impossible de désactiver ce type : " + unitesActives + " unité(s) encore active(s).");
        }

        existing.setActif(false);
        return typeRessourceRepository.save(existing);
    }

    /** Suppression physique (uniquement si aucune unité référence ce type). */
    public void supprimer(String id) {
        currentUserService.requireRole(
                Role.RESPONSABLE_LOGISTIQUE, Role.RESPONSABLE_COOPERATIVE);

        TypeRessource existing = typeRessourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Type de ressource introuvable."));

        boolean aDesUnites = !uniteRepository.findByTypeId(id).isEmpty();
        if (aDesUnites) {
            throw new BusinessException(
                    "Impossible de supprimer ce type : des unités lui sont encore rattachées.");
        }
        typeRessourceRepository.delete(existing);
    }

    // ─────────────────────────────────────────────────────────────
    // Helpers privés
    // ─────────────────────────────────────────────────────────────

    private void valider(TypeRessource t, String idCourant) {
        if (t.getNom() == null || t.getNom().isBlank()) {
            throw new BusinessException("Le nom du type est obligatoire.");
        }
        if (t.getCategorie() == null) {
            throw new BusinessException("La catégorie est obligatoire.");
        }
        // Unicité du nom (insensible à la casse, sauf si on modifie le même doc)
        Query q = new Query(Criteria.where("nom").regex(
                "^" + java.util.regex.Pattern.quote(t.getNom().trim()) + "$", "i"));
        if (idCourant != null) {
            q.addCriteria(Criteria.where("_id").ne(idCourant));
        }
        if (mongoTemplate.exists(q, TypeRessource.class)) {
            throw new BusinessException("Un type de ressource avec ce nom existe déjà.");
        }
    }

    private String normaliseSousCategorie(String sc) {
        return sc == null ? null : sc.trim().toUpperCase();
    }
}
