package com.cooperative.olive.service;

import com.cooperative.olive.dao.CollecteRepository;
import com.cooperative.olive.dao.TourneeRepository;
import com.cooperative.olive.entity.Role;
import com.cooperative.olive.entity.Tournee;
import com.cooperative.olive.exception.BusinessException;
import com.cooperative.olive.exception.ResourceNotFoundException;
import com.cooperative.olive.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TourneeService {

    private final TourneeRepository tourneeRepository;
    private final CollecteRepository collecteRepository;
    private final CurrentUserService currentUserService;

    public List<Tournee> getAll() {
        currentUserService.requireRole(Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE, Role.RESPONSABLE_CHEF_RECOLTE);
        return tourneeRepository.findAll();
    }

    public Tournee create(Tournee tournee) {
        currentUserService.requireRole(Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE);

        validateTournee(tournee);
        tournee.setId(null);
        tournee.setCreatedBy(currentUserService.getRequiredCurrentUser().getId());
        tournee.setCreatedAt(LocalDateTime.now());
        tournee.setUpdatedAt(LocalDateTime.now());
        return tourneeRepository.save(tournee);
    }

    public Tournee update(String id, Tournee updatedTournee) {
        currentUserService.requireRole(Role.RESPONSABLE_COOPERATIVE, Role.RESPONSABLE_LOGISTIQUE);

        Tournee existingTournee = tourneeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tournée introuvable."));

        validateTournee(updatedTournee);
        existingTournee.setCollecteIds(updatedTournee.getCollecteIds());
        existingTournee.setVehicleId(updatedTournee.getVehicleId());
        existingTournee.setDriverId(updatedTournee.getDriverId());
        existingTournee.setAgentIds(updatedTournee.getAgentIds());
        existingTournee.setMaterialIds(updatedTournee.getMaterialIds());
        existingTournee.setDatePrevue(updatedTournee.getDatePrevue());
        existingTournee.setStatus(updatedTournee.getStatus());
        existingTournee.setUpdatedAt(LocalDateTime.now());

        return tourneeRepository.save(existingTournee);
    }

    private void validateTournee(Tournee tournee) {
        if (tournee.getCollecteIds() == null || tournee.getCollecteIds().size() < 2) {
            throw new BusinessException("Une tournée doit contenir au moins deux collectes.");
        }

        for (String collecteId : tournee.getCollecteIds()) {
            if (!collecteRepository.existsById(collecteId)) {
                throw new ResourceNotFoundException("Collecte introuvable: " + collecteId);
            }
        }
    }
}
