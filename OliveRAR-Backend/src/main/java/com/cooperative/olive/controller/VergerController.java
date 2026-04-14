package com.cooperative.olive.controller;

import com.cooperative.olive.entity.Verger;
import com.cooperative.olive.service.VergerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/verger")
@RequiredArgsConstructor
public class VergerController {

    private final VergerService vergerService;

    @GetMapping
    public ResponseEntity<?> getAll(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit
    ) {
        if (page != null || limit != null) {
            return ResponseEntity.ok(vergerService.getAllPaginated(page != null ? page : 1, limit != null ? limit : 5));
        }

        return ResponseEntity.ok(vergerService.getAll());
    }

    @GetMapping("/agriculteur/{agriculteurId}")
    public ResponseEntity<?> getByAgriculteur(
            @PathVariable String agriculteurId,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit
    ) {
        if (page != null || limit != null) {
            return ResponseEntity.ok(
                    vergerService.getByAgriculteurPaginated(
                            agriculteurId,
                            page != null ? page : 1,
                            limit != null ? limit : 5
                    )
            );
        }

        return ResponseEntity.ok(vergerService.getByAgriculteur(agriculteurId));
    }

    @GetMapping("/ready")
    public ResponseEntity<?> getReady() {
        return ResponseEntity.ok(vergerService.getReadyVergers());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable String id) {
        try {
            return ResponseEntity.ok(vergerService.getById(id));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Verger verger) {
        try {
            Verger created = vergerService.create(verger);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "success", true,
                    "data", created,
                    "message", "Verger créé avec succès"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody Verger verger) {
        try {
            Verger updated = vergerService.update(id, verger);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", updated,
                    "message", "Verger modifié avec succès"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id) {
        try {
            vergerService.delete(id);
            return ResponseEntity.ok(Map.of("success", true, "message", "Verger supprimé avec succès"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }
}
