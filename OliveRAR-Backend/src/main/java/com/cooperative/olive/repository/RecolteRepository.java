package com.cooperative.olive.repository;

import com.cooperative.olive.entity.Recolte;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RecolteRepository extends MongoRepository<Recolte, String> {
    Optional<Recolte> findByTourId(String tourId);
    Optional<Recolte> findByChefIdAndTourId(String chefId, String tourId);
}
