package com.cooperative.olive.controller;

import com.cooperative.olive.entity.Resource;
import com.cooperative.olive.service.ResourceService;
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
@RequestMapping("/api/resources")
@RequiredArgsConstructor
public class ResourceController {

    private final ResourceService resourceService;

    @GetMapping
    public ApiResponse<List<Resource>> getAll(@RequestParam(required = false) String type) {
        return ApiResponse.success("Ressources récupérées avec succès.", resourceService.getAll(type));
    }

    @PostMapping
    public ApiResponse<Resource> create(@Valid @RequestBody Resource resource) {
        return ApiResponse.success("Ressource créée avec succès.", resourceService.create(resource));
    }

    @PutMapping("/{id}")
    public ApiResponse<Resource> update(@PathVariable String id, @Valid @RequestBody Resource resource) {
        return ApiResponse.success("Ressource mise à jour avec succès.", resourceService.update(id, resource));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable String id) {
        resourceService.delete(id);
        return ApiResponse.success("Ressource supprimée avec succès.");
    }
}
