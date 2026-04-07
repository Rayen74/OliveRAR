package com.cooperative.olive.dao;

import com.cooperative.olive.entity.Orchard;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OrchardRepository extends MongoRepository<Orchard, String> {
}
