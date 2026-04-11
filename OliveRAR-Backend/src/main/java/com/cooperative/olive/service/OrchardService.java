package com.cooperative.olive.service;

import com.cooperative.olive.dao.OrchardRepository;
import com.cooperative.olive.entity.Orchard;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class OrchardService {

    private final OrchardRepository orchardRepository;

    public List<Orchard> getAll() {
        return orchardRepository.findAll();
    }

    public List<Orchard> getByAgriculteur(String agriculteurId) {
        return orchardRepository.findByAgriculteurId(agriculteurId);
    }

    public Orchard getById(String id) {
        return orchardRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Verger non trouvé"));
    }

    public Orchard create(Orchard orchard) {
        return orchardRepository.save(orchard);
    }

    public Orchard update(String id, Orchard updated) {
        Orchard existing = getById(id);
        existing.setName(updated.getName());
        existing.setLocation(updated.getLocation());
        existing.setStatus(updated.getStatus());
        existing.setSuperficie(updated.getSuperficie());
        return orchardRepository.save(existing);
    }

    public void delete(String id) {
        orchardRepository.deleteById(id);
    }
}