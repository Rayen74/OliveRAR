package com.cooperative.olive.dao;

import com.cooperative.olive.entity.Unite;
import com.cooperative.olive.entity.UniteStatut;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UniteRepository extends MongoRepository<Unite, String> {

    List<Unite> findByStatut(UniteStatut statut);

    List<Unite> findByTypeId(String typeId);

    List<Unite> findByStatutAndTypeId(UniteStatut statut, String typeId);

    Optional<Unite> findByCodeUnique(String codeUnique);

    boolean existsByCodeUnique(String codeUnique);
}
