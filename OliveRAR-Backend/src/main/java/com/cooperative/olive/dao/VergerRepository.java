package com.cooperative.olive.dao;

import com.cooperative.olive.entity.Verger;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface VergerRepository extends MongoRepository<Verger, String> {
    List<Verger> findByAgriculteurId(String agriculteurId);
    Page<Verger> findByAgriculteurId(String agriculteurId, Pageable pageable);
    List<Verger> findByStatut(String statut);
}
