package com.cooperative.olive.dao;

import com.cooperative.olive.entity.Verger;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface VergerRepository extends MongoRepository<Verger, String> {
    List<Verger> findByAgriculteurId(String agriculteurId);
}