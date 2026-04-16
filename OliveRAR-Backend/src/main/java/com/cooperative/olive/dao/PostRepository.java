package com.cooperative.olive.dao;

import com.cooperative.olive.entity.Post;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface PostRepository extends MongoRepository<Post, String> {
    List<Post> findByCategorieOrderByCreatedAtDesc(String categorie);
    List<Post> findByRegionOrderByCreatedAtDesc(String region);
    List<Post> findByAgriculteurIdOrderByCreatedAtDesc(String agriculteurId);
    List<Post> findAllByOrderByCreatedAtDesc();
}