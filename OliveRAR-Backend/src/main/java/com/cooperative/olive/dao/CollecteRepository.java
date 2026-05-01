package com.cooperative.olive.dao;

import com.cooperative.olive.entity.Collecte;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface CollecteRepository extends MongoRepository<Collecte, String> {
    Page<Collecte> findAll(Pageable pageable);
    List<Collecte> findByCreatedBy(String createdBy);
    Page<Collecte> findByCreatedBy(String createdBy, Pageable pageable);
    boolean existsByVergerId(String vergerId);
    boolean existsByVergerIdAndIdNot(String vergerId, String id);
    List<Collecte> findByResponsableAffectationId(String id);
    List<Collecte> findByDatePrevue(LocalDate datePrevue);}
