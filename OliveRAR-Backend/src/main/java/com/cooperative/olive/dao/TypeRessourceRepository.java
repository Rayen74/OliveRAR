package com.cooperative.olive.dao;

import com.cooperative.olive.entity.RessourceCategorie;
import com.cooperative.olive.entity.TypeRessource;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TypeRessourceRepository extends MongoRepository<TypeRessource, String> {

    List<TypeRessource> findByActifTrue();

    List<TypeRessource> findByCategorieAndActifTrue(RessourceCategorie categorie);

    boolean existsByNomIgnoreCase(String nom);
}
