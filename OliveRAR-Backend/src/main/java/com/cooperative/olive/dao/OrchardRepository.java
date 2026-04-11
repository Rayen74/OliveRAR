package com.cooperative.olive.dao;

import com.cooperative.olive.entity.Orchard;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface OrchardRepository extends MongoRepository<Orchard, String> {
    List<Orchard> findByAgriculteurId(String agriculteurId);
}