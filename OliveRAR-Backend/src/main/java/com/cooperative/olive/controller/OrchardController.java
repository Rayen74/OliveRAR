package com.cooperative.olive.controller;

import com.cooperative.olive.entity.Orchard;
import com.cooperative.olive.service.OrchardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orchard")
@RequiredArgsConstructor
public class OrchardController {

    private final OrchardService orchardService;

    // GET tous les vergers
    @GetMapping
    public ResponseEntity<List<Orchard>> getAll() {
        return ResponseEntity.ok(orchardService.getAll());
    }

    // GET vergers par agriculteur
    @GetMapping("/agriculteur/{agriculteurId}")
    public ResponseEntity<List<Orchard>> getByAgriculteur(@PathVariable String agriculteurId) {
        return ResponseEntity.ok(orchardService.getByAgriculteur(agriculteurId));
    }

    // GET un verger par id
    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable String id) {
        try {
            return ResponseEntity.ok(orchardService.getById(id));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    // POST créer un verger
    @PostMapping
    public ResponseEntity<?> create(@RequestBody Orchard orchard) {
        try {
            Orchard created = orchardService.create(orchard);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "success", true,
                    "data", created,
                    "message", "Verger créé avec succès"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }

    // PUT modifier un verger
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody Orchard orchard) {
        try {
            Orchard updated = orchardService.update(id, orchard);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", updated,
                    "message", "Verger modifié avec succès"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    // DELETE supprimer un verger
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id) {
        try {
            orchardService.delete(id);
            return ResponseEntity.ok(Map.of("success", true, "message", "Verger supprimé avec succès"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }
}