package com.cooperative.olive.controller;

import com.cooperative.olive.entity.Verger;
import com.cooperative.olive.service.VergerService;
import com.cooperative.olive.util.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/verger")
@RequiredArgsConstructor
public class VergerController {

    private final VergerService vergerService;

    @GetMapping
    public Object getAll(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit
    ) {
        if (page != null || limit != null) {
            return vergerService.getAllPaginated(page != null ? page : 1, limit != null ? limit : 5);
        }

        return vergerService.getAll();
    }

    @GetMapping("/agriculteur/{agriculteurId}")
    public Object getByAgriculteur(
            @PathVariable String agriculteurId,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit
    ) {
        if (page != null || limit != null) {
            return vergerService.getByAgriculteurPaginated(
                    agriculteurId,
                    page != null ? page : 1,
                    limit != null ? limit : 5
            );
        }

        return vergerService.getByAgriculteur(agriculteurId);
    }

    @GetMapping("/ready")
    public List<Verger> getReady() {
        return vergerService.getReadyVergers();
    }

    @GetMapping("/{id}")
    public Verger getById(@PathVariable String id) {
        return vergerService.getById(id);
    }

    @PostMapping
    public ApiResponse<Verger> create(@Valid @RequestBody Verger verger) {
        return ApiResponse.success("Verger créé avec succès.", vergerService.create(verger));
    }

    @PutMapping("/{id}")
    public ApiResponse<Verger> update(@PathVariable String id, @Valid @RequestBody Verger verger) {
        return ApiResponse.success("Verger modifié avec succès.", vergerService.update(id, verger));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable String id) {
        vergerService.delete(id);
        return ApiResponse.success("Verger supprimé avec succès.");
    }
}
