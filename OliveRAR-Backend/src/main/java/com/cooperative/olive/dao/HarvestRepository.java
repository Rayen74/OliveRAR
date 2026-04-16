package com.cooperative.olive.dao;

import com.cooperative.olive.entity.Harvest;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface HarvestRepository extends MongoRepository<Harvest, String> {
}
