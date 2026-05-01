package com.cooperative.olive.controller;

import com.cooperative.olive.entity.Resource;
import com.cooperative.olive.entity.ResourceCategorie;
import com.cooperative.olive.entity.ResourceStatus;
import com.cooperative.olive.service.ResourceService;
import com.cooperative.olive.util.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/resources")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ResourceController {

    private final ResourceService resourceService;

    // GET ALL
    @GetMapping
    public ApiResponse<List<Resource>> getAll(
            @RequestParam(required = false) String type
    ) {
        return ApiResponse.success(
                "Resources loaded",
                resourceService.getAll(type)
        );
    }

    // GET BY ID
    @GetMapping("/{id}")
    public ApiResponse<Resource> getById(@PathVariable String id) {
        return ApiResponse.success(
                "Resource found",
                resourceService.getById(id)
        );
    }
    // GET ALL CATEGORIES (Pour la liste déroulante)
    @GetMapping("/categories")
    public ApiResponse<ResourceCategorie[]> getCategories() {
        return ApiResponse.success(
                "Categories loaded",
                ResourceCategorie.values()
        );
    }

    // GET ALL STATUSES (Pour la liste déroulante)
    @GetMapping("/statuses")
    public ApiResponse<ResourceStatus[]> getStatuses() {
        return ApiResponse.success(
                "Statuses loaded",
                ResourceStatus.values()
        );
    }

    // CREATE
    @PostMapping
    public ApiResponse<Resource> create(
            @Valid @RequestBody Resource resource
    ) {
        return ApiResponse.success(
                "Resource created",
                resourceService.create(resource)
        );
    }

    // UPDATE
    @PutMapping("/{id}")
    public ApiResponse<Resource> update(
            @PathVariable String id,
            @Valid @RequestBody Resource resource
    ) {
        return ApiResponse.success(
                "Resource updated",
                resourceService.update(id, resource)
        );
    }

    // DELETE
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable String id) {
        resourceService.delete(id);
        return ApiResponse.success("Resource deleted");
    }

    // UPLOAD IMAGE
    @PostMapping(
            value = "/{id}/image",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ApiResponse<Resource> uploadImage(
            @PathVariable String id,
            @RequestParam("file") MultipartFile file
    ) {
        return ApiResponse.success(
                "Image uploaded",
                resourceService.uploadImage(id, file)
        );
    }
    @PatchMapping("/{id}/status")
    public ApiResponse<Resource> updateStatus(
            @PathVariable String id,
            @RequestParam ResourceStatus status
    ) {
        return ApiResponse.success(
                "Statut mis à jour",
                resourceService.updateStatus(id, status)
        );
    }
}