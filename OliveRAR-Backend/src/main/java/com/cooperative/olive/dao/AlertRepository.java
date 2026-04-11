package com.cooperative.olive.dao;

import com.cooperative.olive.entity.Alert;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface AlertRepository extends MongoRepository<Alert, String> {
    List<Alert> findByDestinataireRole(String destinataireRole);
    List<Alert> findByVergerId(String vergerId);
    List<Alert> findByAgriculteurId(String agriculteurId);
}