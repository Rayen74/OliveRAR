package com.cooperative.olive.service;

import com.cooperative.olive.dao.ResourceRepository;
import com.cooperative.olive.entity.Resource;
import com.cooperative.olive.entity.ResourceStatus;
import com.cooperative.olive.entity.Role;
import com.cooperative.olive.exception.BusinessException;
import com.cooperative.olive.exception.ResourceNotFoundException;
import com.cooperative.olive.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ResourceService {

    private final ResourceRepository resourceRepository;
    private final CurrentUserService currentUserService;
    private final ImageService imageService;

    public List<Resource> getAll(String type) {

        currentUserService.requireRole(
                Role.RESPONSABLE_LOGISTIQUE,
                Role.RESPONSABLE_COOPERATIVE
        );

        List<Resource> list = resourceRepository.findAll();

        if (type == null || type.isBlank()) {
            return list;
        }

        return list.stream()
                .filter(r -> r.getCategorie() != null &&
                        r.getCategorie().name().equalsIgnoreCase(type))
                .toList();
    }

    public Resource getById(String id) {
        return resourceRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Resource not found"));
    }

    public Resource create(Resource resource) {

        currentUserService.requireRole(
                Role.RESPONSABLE_LOGISTIQUE,
                Role.RESPONSABLE_COOPERATIVE
        );

        validate(resource);
        resource.setId(null);

        return resourceRepository.save(resource);
    }

    public Resource update(String id, Resource resource) {

        currentUserService.requireRole(
                Role.RESPONSABLE_LOGISTIQUE,
                Role.RESPONSABLE_COOPERATIVE
        );

        Resource existing = resourceRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Resource not found"));

        existing.setName(resource.getName());
        existing.setCategorie(resource.getCategorie());
        existing.setCode(resource.getCode());
        existing.setStatus(resource.getStatus());
        existing.setDescription(resource.getDescription());

        return resourceRepository.save(existing);
    }
    public Resource updateStatus(String id, ResourceStatus status) {
        Resource resource = resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ressource introuvable."));
        resource.setStatus(status);
        return resourceRepository.save(resource);
    }
    public void delete(String id) {

        currentUserService.requireRole(
                Role.RESPONSABLE_LOGISTIQUE,
                Role.RESPONSABLE_COOPERATIVE
        );

        if (!resourceRepository.existsById(id)) {
            throw new ResourceNotFoundException("Resource not found");
        }

        resourceRepository.deleteById(id);
    }

    public Resource uploadImage(String id, MultipartFile file) {

        Resource resource = resourceRepository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Resource not found"));

        try {
            String url = imageService.uploadImage(file);
            resource.setImageUrl(url);
        } catch (IOException e) {
            throw new RuntimeException("Image upload failed", e);
        }

        return resourceRepository.save(resource);
    }

    private void validate(Resource r) {

        if (r.getName() == null || r.getName().isBlank()) {
            throw new BusinessException("Name is required");
        }

        if (r.getCategorie() == null) {
            throw new BusinessException("Categorie is required");
        }

        if (r.getStatus() == null) {
            throw new BusinessException("Status is required");
        }
    }
}