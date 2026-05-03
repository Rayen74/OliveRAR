package com.cooperative.olive.service;

import com.cooperative.olive.controller.PaginatedResponse;
import com.cooperative.olive.dao.ActiviteRepository;
import com.cooperative.olive.entity.Activite;
import com.cooperative.olive.entity.ActiviteType;
import com.cooperative.olive.entity.Role;
import com.cooperative.olive.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ActiviteService {

    private final ActiviteRepository activiteRepository;
    private final CurrentUserService currentUserService;
    private final org.springframework.data.mongodb.core.MongoTemplate mongoTemplate;

    /**
     * Enregistre une activité de manière non bloquante.
     * Ne propage jamais d'exception vers l'appelant.
     */
    public void enregistrer(
            String userId,
            String userNom,
            String userRole,
            ActiviteType type,
            String module,
            String description,
            String entiteId,
            String entiteNom,
            Map<String, Object> details
    ) {
        try {
            Activite activite = Activite.builder()
                    .userId(userId)
                    .userNom(userNom)
                    .userRole(userRole)
                    .type(type)
                    .module(module)
                    .description(description)
                    .entiteId(entiteId)
                    .entiteNom(entiteNom)
                    .dateAction(Instant.now())
                    .details(details)
                    .build();

            activiteRepository.save(activite);
            log.debug("Activité enregistrée : [{}] {} par {}", type, description, userNom);
        } catch (Exception ex) {
            // Non bloquant — on log l'erreur mais on ne propage pas
            log.error("Erreur lors de l'enregistrement de l'activité [{}] pour userId={} : {}",
                    type, userId, ex.getMessage(), ex);
        }
    }

    /**
     * Raccourci pour enregistrer via l'utilisateur connecté courant.
     */
    public void enregistrerPourUtilisateurCourant(
            ActiviteType type,
            String module,
            String description,
            String entiteId,
            String entiteNom,
            Map<String, Object> details
    ) {
        try {
            var user = currentUserService.getRequiredCurrentUser();
            String nom = user.getNom() + " " + user.getPrenom();
            enregistrer(user.getId(), nom, user.getRole().name(),
                    type, module, description, entiteId, entiteNom, details);
        } catch (Exception ex) {
            log.error("Impossible de récupérer l'utilisateur courant pour le journal d'activité : {}", ex.getMessage(), ex);
        }
    }

    /**
     * Récupère les activités avec filtres et pagination.
     * - RESPONSABLE_COOPERATIVE : peut filtrer sur n'importe quel userId.
     * - RESPONSABLE_LOGISTIQUE  : restreint à son propre userId.
     */
    public PaginatedResponse<Activite> getActivites(
            String module,
            String typeStr,
            Instant debut,
            Instant fin,
            int page,
            int size
    ) {
        currentUserService.requireRole(
                Role.RESPONSABLE_COOPERATIVE,
                Role.RESPONSABLE_LOGISTIQUE,
                Role.RESPONSABLE_CHEF_RECOLTE,
                Role.AGRICULTEUR
        );
        var currentUser = currentUserService.getRequiredCurrentUser();
        boolean isAdmin = currentUser.getRole() == Role.RESPONSABLE_COOPERATIVE;

        ActiviteType typeEnum = parseType(typeStr);

        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                size <= 0 ? 15 : Math.min(size, 100),
                Sort.by(Sort.Direction.DESC, "dateAction")
        );

        org.springframework.data.mongodb.core.query.Query query = new org.springframework.data.mongodb.core.query.Query();

        // Si non-Admin, on restreint strictement à son propre ID
        if (!isAdmin) {
            query.addCriteria(org.springframework.data.mongodb.core.query.Criteria.where("userId").is(currentUser.getId()));
        }

        if (module != null && !module.trim().isEmpty()) {
            query.addCriteria(org.springframework.data.mongodb.core.query.Criteria.where("module").is(module));
        }

        if (typeEnum != null) {
            query.addCriteria(org.springframework.data.mongodb.core.query.Criteria.where("type").is(typeEnum));
        }

        if (debut != null || fin != null) {
            org.springframework.data.mongodb.core.query.Criteria dateCriteria = org.springframework.data.mongodb.core.query.Criteria.where("dateAction");
            if (debut != null) dateCriteria = dateCriteria.gte(debut);
            if (fin != null)   dateCriteria = dateCriteria.lte(fin);
            query.addCriteria(dateCriteria);
        }

        log.info("Exécution de la requête d'activité - Page: {}, Size: {}, Query: {}", page, size, query);
        long totalElements = mongoTemplate.count(query, Activite.class, "activites");
        
        query.with(pageable);
        java.util.List<Activite> content = mongoTemplate.find(query, Activite.class, "activites");
        log.info("Résultats d'activité trouvés : {} / {}", content.size(), totalElements);

        return new PaginatedResponse<>(
                content,
                totalElements,
                (int) Math.ceil((double) totalElements / pageable.getPageSize()),
                pageable.getPageNumber() + 1,
                pageable.getPageSize()
        );
    }

    private ActiviteType parseType(String typeStr) {
        if (typeStr == null || typeStr.isBlank()) return null;
        try {
            return ActiviteType.valueOf(typeStr.toUpperCase());
        } catch (IllegalArgumentException ex) {
            log.warn("Type d'activité inconnu : {}", typeStr);
            return null;
        }
    }
}
