package com.cooperative.olive.dao;

import com.cooperative.olive.entity.Activite;
import com.cooperative.olive.entity.ActiviteType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;

@Repository
public interface ActiviteRepository extends MongoRepository<Activite, String> {

}
