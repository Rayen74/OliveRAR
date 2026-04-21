package com.cooperative.olive.service;

import com.cooperative.olive.dao.ResourceRepository;
import com.cooperative.olive.entity.Resource;
import com.cooperative.olive.entity.Role;
import com.cooperative.olive.exception.BusinessException;
import com.cooperative.olive.exception.ResourceNotFoundException;
import com.cooperative.olive.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ResourceService {

    private final ResourceRepository resourceRepository;
    private final CurrentUserService currentUserService;

    public List<Resource> getAll(String type) {
        currentUserService.requireRole(Role.RESPONSABLE_LOGISTIQUE, Role.RESPONSABLE_COOPERATIVE);
        List<Resource> resources = resourceRepository.findAll();
        if (type == null || type.isBlank()) {
            return resources;
        }

        return resources.stream()
                .filter(resource -> type.equalsIgnoreCase(resource.getType()))
                .toList();
    }

    public Resource create(Resource resource) {
        currentUserService.requireRole(Role.RESPONSABLE_LOGISTIQUE, Role.RESPONSABLE_COOPERATIVE);
        validateResource(resource);
        resource.setId(null);
        resource.setAvailable(resource.isAvailable() || resource.getStatus() == null || !"INDISPONIBLE".equalsIgnoreCase(resource.getStatus()));
        return resourceRepository.save(resource);
    }

    public Resource update(String id, Resource resourceDetails) {
        currentUserService.requireRole(Role.RESPONSABLE_LOGISTIQUE, Role.RESPONSABLE_COOPERATIVE);
        validateResource(resourceDetails);

        Resource existingResource = resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ressource introuvable."));

        existingResource.setName(resourceDetails.getName());
        existingResource.setType(resourceDetails.getType());
        existingResource.setCode(resourceDetails.getCode());
        existingResource.setStatus(resourceDetails.getStatus());
        existingResource.setDescription(resourceDetails.getDescription());
        existingResource.setAvailable(resourceDetails.isAvailable());
        return resourceRepository.save(existingResource);
    }

    public void delete(String id) {
        currentUserService.requireRole(Role.RESPONSABLE_LOGISTIQUE, Role.RESPONSABLE_COOPERATIVE);
        if (!resourceRepository.existsById(id)) {
            throw new ResourceNotFoundException("Ressource introuvable.");
        }
        resourceRepository.deleteById(id);
    }

    private void validateResource(Resource resource) {
        if (resource.getType() == null || resource.getType().isBlank()) {
            throw new BusinessException("Le type de ressource est obligatoire.");
        }
        if (resource.getName() == null || resource.getName().isBlank()) {
            throw new BusinessException("Le nom de la ressource est obligatoire.");
        }
    }
}
