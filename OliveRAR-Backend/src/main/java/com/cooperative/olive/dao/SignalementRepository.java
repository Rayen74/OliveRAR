package com.cooperative.olive.dao;

import com.cooperative.olive.entity.Signalement;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SignalementRepository extends MongoRepository<Signalement, String> {
    List<Signalement> findByCreatedByOrderByCreatedAtDesc(String createdBy);
    List<Signalement> findByVergerIdOrderByCreatedAtDesc(String vergerId);
}
