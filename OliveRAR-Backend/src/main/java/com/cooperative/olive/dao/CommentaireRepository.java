package com.cooperative.olive.dao;

import com.cooperative.olive.entity.Commentaire;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface CommentaireRepository extends MongoRepository<Commentaire, String> {
    List<Commentaire> findByPostIdOrderByCreatedAtAsc(String postId);
    void deleteByPostId(String postId);
}