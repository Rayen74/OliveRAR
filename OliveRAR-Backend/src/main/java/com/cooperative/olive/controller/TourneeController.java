package com.cooperative.olive.controller;

import com.cooperative.olive.entity.Tournee;
import com.cooperative.olive.service.TourneeService;
import com.cooperative.olive.util.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/tournees")
@RequiredArgsConstructor
public class TourneeController {

    private final TourneeService tourneeService;

    @GetMapping
    public ApiResponse<List<Tournee>> getAll() {
        return ApiResponse.success("Tournées récupérées avec succès.", tourneeService.getAll());
    }

    @PostMapping
    public ApiResponse<Tournee> create(@Valid @RequestBody Tournee tournee) {
        return ApiResponse.success("Tournée créée avec succès.", tourneeService.create(tournee));
    }

    @PutMapping("/{id}")
    public ApiResponse<Tournee> update(@PathVariable String id, @Valid @RequestBody Tournee tournee) {
        return ApiResponse.success("Tournée mise à jour avec succès.", tourneeService.update(id, tournee));
    }
}
