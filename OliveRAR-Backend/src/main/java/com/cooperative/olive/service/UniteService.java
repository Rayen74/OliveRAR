package com.cooperative.olive.service;

import com.cooperative.olive.dao.TypeRessourceRepository;
import com.cooperative.olive.dao.UniteRepository;
import com.cooperative.olive.entity.Role;
import com.cooperative.olive.entity.TypeRessource;
import com.cooperative.olive.entity.Unite;
import com.cooperative.olive.entity.UniteStatut;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UniteService {

    private static final int SEUIL_MAINTENANCE_PAR_DEFAUT = 180;

    private final UniteRepository uniteRepository;
    private final TypeRessourceRepository typeRessourceRepository;
    private final MongoTemplate mongoTemplate;
    private final CurrentUserService currentUserService;

    public Map<String, Object> getAll(int page, int size, String search,
                                       String statut, String typeId, Boolean disponible) {
        currentUserService.requireRole(Role.RESPONSABLE_LOGISTIQUE, Role.RESPONSABLE_COOPERATIVE);
        int safePage = Math.max(page, 0);
        int safeSize = size <= 0 ? 6 : Math.min(size, 50);
        Query query = new Query();
        if (search != null && !search.isBlank()) {
            query.addCriteria(Criteria.where("codeUnique")
                    .regex(".*" + java.util.regex.Pattern.quote(search.trim()) + ".*", "i"));
        }
        if (statut != null && !statut.isBlank()) {
            try {
                query.addCriteria(Criteria.where("statut")
                        .is(UniteStatut.valueOf(statut.trim().toUpperCase())));
            } catch (IllegalArgumentException e) {
                throw new BusinessException("Statut invalide : " + statut);
            }
        }
        if (typeId != null && !typeId.isBlank()) {
            query.addCriteria(Criteria.where("typeId").is(typeId.trim()));
        }
        if (disponible != null) {
            query.addCriteria(Criteria.where("disponibilite").is(disponible));
        }
        long totalElements = mongoTemplate.count(query, Unite.class);
        int totalPages = Math.max(1, (int) Math.ceil((double) totalElements / safeSize));
        query.with(PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.ASC, "codeUnique")));
        List<Map<String, Object>> items = mongoTemplate.find(query, Unite.class)
                .stream().map(this::enrichUnite).toList();
        return Map.of("success", true, "items", items, "page", safePage,
                "size", safeSize, "totalElements", totalElements, "totalPages", totalPages);
    }

    public Map<String, Object> getById(String id) {
        currentUserService.requireRole(Role.RESPONSABLE_LOGISTIQUE, Role.RESPONSABLE_COOPERATIVE);
        return enrichUnite(uniteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("UnitÃ© introuvable.")));
    }

    public List<Map<String, Object>> getDisponibles(String typeId, String categorie, String sousCategorie) {
        currentUserService.requireRole(Role.RESPONSABLE_LOGISTIQUE, Role.RESPONSABLE_COOPERATIVE,
                Role.RESPONSABLE_CHEF_RECOLTE);
        Query query = new Query(Criteria.where("statut").is(UniteStatut.DISPONIBLE));
        if (typeId != null && !typeId.isBlank()) {
            query.addCriteria(Criteria.where("typeId").is(typeId.trim()));
        }
        return mongoTemplate.find(query, Unite.class).stream()
                .filter(u -> matchesCategorieFilter(u, categorie, sousCategorie))
                .map(this::enrichUnite).toList();
    }

    public List<Map<String, String>> getStatuts() {
        return Arrays.stream(UniteStatut.values())
                .map(s -> Map.of("value", s.name(), "libelle", s.libelle())).toList();
    }

    public Unite creer(Unite payload) {
        currentUserService.requireRole(Role.RESPONSABLE_LOGISTIQUE, Role.RESPONSABLE_COOPERATIVE);
        validerCreation(payload);
        verifierTypeExiste(payload.getTypeId());
        payload.setId(null);
        payload.setStatut(UniteStatut.DISPONIBLE);
        payload.setDisponibilite(true);
        payload.setHistorique(new ArrayList<>());
        appliquerAlerteMaintenance(payload);
        ajouterHistorique(payload, "CREATION", "UnitÃ© crÃ©Ã©e.", UniteStatut.DISPONIBLE);
        return uniteRepository.save(payload);
    }

    public List<Unite> creerMultiple(String typeId, String prefixCode, int debut, int nombre, Unite template) {
        currentUserService.requireRole(Role.RESPONSABLE_LOGISTIQUE, Role.RESPONSABLE_COOPERATIVE);
        if (nombre <= 0 || nombre > 50) {
            throw new BusinessException("Le nombre d'unitÃ©s doit Ãªtre compris entre 1 et 50.");
        }
        verifierTypeExiste(typeId);
        List<Unite> creees = new ArrayList<>();
        for (int i = 0; i < nombre; i++) {
            String code = prefixCode.trim().toUpperCase() + "-" + String.format("%03d", debut + i);
            if (uniteRepository.existsByCodeUnique(code)) {
                throw new BusinessException("Le code " + code + " est dÃ©jÃ  utilisÃ©.");
            }
            Unite u = new Unite();
            u.setTypeId(typeId);
            u.setCodeUnique(code);
            u.setStatut(UniteStatut.DISPONIBLE);
            u.setDisponibilite(true);
            int seuil = SEUIL_MAINTENANCE_PAR_DEFAUT;
            if (template != null) {
                u.setLocalisation(template.getLocalisation());
                u.setNotes(template.getNotes());
                u.setDerniereMaintenanceDate(template.getDerniereMaintenanceDate());
                u.setConducteurHabituelId(template.getConducteurHabituelId());
                if (template.getSeuilMaintenanceJours() > 0) {
                    seuil = template.getSeuilMaintenanceJours();
                }
            }
            u.setSeuilMaintenanceJours(seuil);
            u.setHistorique(new ArrayList<>());
            appliquerAlerteMaintenance(u);
            ajouterHistorique(u, "CREATION", "UnitÃ© crÃ©Ã©e en multi-crÃ©ation.", UniteStatut.DISPONIBLE);
            creees.add(uniteRepository.save(u));
        }
        return creees;
    }

    public Unite modifier(String id, Unite payload) {
        currentUserService.requireRole(Role.RESPONSABLE_LOGISTIQUE, Role.RESPONSABLE_COOPERATIVE);
        Unite existing = uniteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("UnitÃ© introuvable."));
        if (!existing.getCodeUnique().equals(payload.getCodeUnique())
                && uniteRepository.existsByCodeUnique(payload.getCodeUnique())) {
            throw new BusinessException("Le code unique " + payload.getCodeUnique() + " est dÃ©jÃ  utilisÃ©.");
        }
        verifierTypeExiste(payload.getTypeId());
        existing.setCodeUnique(payload.getCodeUnique().trim().toUpperCase());
        existing.setTypeId(payload.getTypeId());
        existing.setLocalisation(payload.getLocalisation());
        existing.setNotes(payload.getNotes());
        existing.setDerniereMaintenanceDate(payload.getDerniereMaintenanceDate());
        existing.setConducteurHabituelId(payload.getConducteurHabituelId());
        if (payload.getSeuilMaintenanceJours() > 0) {
            existing.setSeuilMaintenanceJours(payload.getSeuilMaintenanceJours());
        }
        appliquerAlerteMaintenance(existing);
        return uniteRepository.save(existing);
    }

    public Unite changerStatut(String id, String nouveauStatutStr, String note) {
        currentUserService.requireRole(Role.RESPONSABLE_LOGISTIQUE, Role.RESPONSABLE_COOPERATIVE);
        Unite unite = uniteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("UnitÃ© introuvable."));
        UniteStatut nouveauStatut;
        try {
            nouveauStatut = UniteStatut.valueOf(nouveauStatutStr.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Statut invalide : " + nouveauStatutStr);
        }
        if (!unite.getStatut().peutTransitionnerVers(nouveauStatut)) {
            throw new BusinessException(
                    "Transition interdite : " + unite.getStatut().name() + " \u2192 " + nouveauStatut.name());
        }
        unite.setStatut(nouveauStatut);
        unite.setDisponibilite(nouveauStatut == UniteStatut.DISPONIBLE);
        ajouterHistorique(unite, "CHANGEMENT_STATUT",
                (note != null && !note.isBlank()) ? note : "Changement de statut.", nouveauStatut);
        return uniteRepository.save(unite);
    }

    public Unite desactiver(String id, String note) {
        currentUserService.requireRole(Role.RESPONSABLE_LOGISTIQUE, Role.RESPONSABLE_COOPERATIVE);
        Unite unite = uniteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("UnitÃ© introuvable."));
        if (unite.getStatut() == UniteStatut.AFFECTE) {
            throw new BusinessException("Impossible de dÃ©sactiver une unitÃ© actuellement affectÃ©e.");
        }
        unite.setStatut(UniteStatut.HORS_SERVICE);
        unite.setDisponibilite(false);
        ajouterHistorique(unite, "DESACTIVATION",
                (note != null && !note.isBlank()) ? note : "Mise hors service.", UniteStatut.HORS_SERVICE);
        return uniteRepository.save(unite);
    }

    public void supprimer(String id) {
        currentUserService.requireRole(Role.RESPONSABLE_LOGISTIQUE, Role.RESPONSABLE_COOPERATIVE);
        Unite unite = uniteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("UnitÃ© introuvable."));
        if (unite.getStatut() != UniteStatut.HORS_SERVICE) {
            throw new BusinessException("Seules les unitÃ©s HORS_SERVICE peuvent Ãªtre supprimÃ©es dÃ©finitivement.");
        }
        uniteRepository.delete(unite);
    }

    // â”€â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    private void validerCreation(Unite u) {
        if (u.getCodeUnique() == null || u.getCodeUnique().isBlank()) {
            throw new BusinessException("Le code unique est obligatoire.");
        }
        if (uniteRepository.existsByCodeUnique(u.getCodeUnique().trim().toUpperCase())) {
            throw new BusinessException("Le code unique " + u.getCodeUnique() + " est dÃ©jÃ  utilisÃ©.");
        }
        if (u.getTypeId() == null || u.getTypeId().isBlank()) {
            throw new BusinessException("Le type de ressource est obligatoire.");
        }
    }

    private void verifierTypeExiste(String typeId) {
        if (typeId == null || typeId.isBlank() || !typeRessourceRepository.existsById(typeId)) {
            throw new ResourceNotFoundException("Type de ressource introuvable.");
        }
    }

    private void ajouterHistorique(Unite unite, String action, String note, UniteStatut statut) {
        Unite.HistoriqueEntree entree = new Unite.HistoriqueEntree();
        entree.setDate(LocalDateTime.now());
        entree.setAction(action);
        entree.setStatut(statut.name());
        entree.setNote(note);
        try {
            entree.setAuteurId(currentUserService.getRequiredCurrentUser().getId());
        } catch (Exception ignored) { /* seeds / appels internes */ }
        if (unite.getHistorique() == null) unite.setHistorique(new ArrayList<>());
        unite.getHistorique().add(entree);
    }

    private void appliquerAlerteMaintenance(Unite unite) {
        if (unite.getDerniereMaintenanceDate() == null) {
            unite.setAlerteMaintenanceActive(true);
            return;
        }
        long joursDepuis = LocalDate.now().toEpochDay()
                - unite.getDerniereMaintenanceDate().toEpochDay();
        int seuil = unite.getSeuilMaintenanceJours() > 0
                ? unite.getSeuilMaintenanceJours() : SEUIL_MAINTENANCE_PAR_DEFAUT;
        unite.setAlerteMaintenanceActive(joursDepuis > seuil);
    }

    private boolean matchesCategorieFilter(Unite u, String categorie, String sousCategorie) {
        if ((categorie == null || categorie.isBlank()) && (sousCategorie == null || sousCategorie.isBlank())) {
            return true;
        }
        TypeRessource type = typeRessourceRepository.findById(u.getTypeId()).orElse(null);
        if (type == null) return false;
        boolean catOk = categorie == null || categorie.isBlank()
                || (type.getCategorie() != null && type.getCategorie().name().equalsIgnoreCase(categorie));
        boolean scOk = sousCategorie == null || sousCategorie.isBlank()
                || sousCategorie.equalsIgnoreCase(type.getSousCategorie());
        return catOk && scOk;
    }

    private Map<String, Object> enrichUnite(Unite unite) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", unite.getId());
        map.put("codeUnique", unite.getCodeUnique());
        map.put("typeId", unite.getTypeId());
        map.put("statut", unite.getStatut() != null ? unite.getStatut().name() : null);
        map.put("statutLibelle", unite.getStatut() != null ? unite.getStatut().libelle() : null);
        map.put("disponibilite", unite.isDisponibilite());
        map.put("localisation", unite.getLocalisation());
        map.put("derniereMaintenanceDate", unite.getDerniereMaintenanceDate());
        map.put("alerteMaintenanceActive", unite.isAlerteMaintenanceActive());
        map.put("conducteurHabituelId", unite.getConducteurHabituelId());
        map.put("notes", unite.getNotes());
        map.put("historique", unite.getHistorique() != null ? unite.getHistorique() : List.of());

        typeRessourceRepository.findById(unite.getTypeId()).ifPresent(type -> {
            Map<String, Object> typeMap = new HashMap<>();
            typeMap.put("id", type.getId());
            typeMap.put("nom", type.getNom());
            typeMap.put("categorie", type.getCategorie() != null ? type.getCategorie().name() : null);
            typeMap.put("categorieLibelle", type.getCategorie() != null ? type.getCategorie().libelle() : null);
            typeMap.put("sousCategorie", type.getSousCategorie());
            typeMap.put("capacite", type.getCapacite());
            map.put("type", typeMap);
            String cap = "";
            if (type.getCapacite() != null && type.getCapacite().getValeur() != null) {
                cap = " \u2013 " + type.getCapacite().getValeur()
                        + (type.getCapacite().getUnite() != null ? " " + type.getCapacite().getUnite() : "");
            }
            map.put("label", "[" + unite.getCodeUnique() + "] " + type.getNom()
                    + cap
                    + (unite.getLocalisation() != null ? " \u2013 " + unite.getLocalisation() : "")
                    + (type.getSousCategorie() != null ? " \u2013 " + type.getSousCategorie() : ""));
        });
        return map;
    }
}

