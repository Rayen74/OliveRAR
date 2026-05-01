package com.cooperative.olive.repository;

import com.cooperative.olive.entity.VergerIssue;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VergerIssueRepository extends MongoRepository<VergerIssue, String> {
    
    List<VergerIssue> findByVergerIdAndDeletedFalse(String vergerId);
    
    List<VergerIssue> findByDeletedFalse();

    @Query("{'vergerId': ?0, 'statut': ?1, 'type': ?2, 'gravite': ?3, 'deleted': false}")
    List<VergerIssue> findWithFilters(String vergerId, String statut, String type, String gravite);
}
