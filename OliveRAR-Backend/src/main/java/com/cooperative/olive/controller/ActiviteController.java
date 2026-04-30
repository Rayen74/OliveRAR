package com.cooperative.olive.controller;

import com.cooperative.olive.entity.Activite;
import com.cooperative.olive.service.ActiviteService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

@RestController
@RequestMapping("/api/activites")
@RequiredArgsConstructor
public class ActiviteController {

    private final ActiviteService activiteService;

    /**
     * GET /api/activites
     *
     * Paramètres optionnels :
     *   module  – filtre sur le module (ex. "VERGER", "EQUIPEMENT")
     *   type    – filtre sur ActiviteType (ex. "VERGER_CREE")
     *   debut   – date de début (yyyy-MM-dd)
     *   fin     – date de fin   (yyyy-MM-dd)
     *   page    – numéro de page (0-based, défaut 0)
     *   size    – taille de page (défaut 15)
     */
    @GetMapping
    public PaginatedResponse<Activite> getActivites(
            @RequestParam(required = false) String module,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate debut,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fin,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size
    ) {
        Instant debutInstant = debut != null ? debut.atStartOfDay(ZoneOffset.UTC).toInstant() : null;
        Instant finInstant   = fin   != null ? fin.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant() : null;

        return activiteService.getActivites(module, type, debutInstant, finInstant, page, size);
    }
}
