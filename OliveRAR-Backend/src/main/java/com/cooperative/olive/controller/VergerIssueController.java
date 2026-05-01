package com.cooperative.olive.controller;

import com.cooperative.olive.entity.VergerIssue;
import com.cooperative.olive.service.VergerIssueService;
import com.cooperative.olive.util.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/verger-issues")
@RequiredArgsConstructor
public class VergerIssueController {

    private final VergerIssueService vergerIssueService;

    @GetMapping
    public List<VergerIssue> getAll(
            @RequestParam(required = false) String vergerId,
            @RequestParam(required = false) String statut,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String gravite) {
        return vergerIssueService.getAll(vergerId, statut, type, gravite);
    }

    @GetMapping("/{id}")
    public VergerIssue getById(@PathVariable String id) {
        return vergerIssueService.getById(id);
    }

    @PostMapping
    public ApiResponse<VergerIssue> create(@Valid @RequestBody VergerIssue issue) {
        return ApiResponse.success("Signalement créé avec succès.", vergerIssueService.create(issue));
    }

    @PutMapping("/{id}")
    public ApiResponse<VergerIssue> update(@PathVariable String id, @Valid @RequestBody VergerIssue issue) {
        return ApiResponse.success("Signalement mis à jour avec succès.", vergerIssueService.update(id, issue));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable String id) {
        vergerIssueService.delete(id);
        return ApiResponse.success("Signalement supprimé avec succès.");
    }
}
