package com.cooperative.olive.service;

import com.cooperative.olive.dao.PostRepository;
import com.cooperative.olive.entity.Commentaire;
import com.cooperative.olive.entity.Post;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class PostService {

    @Autowired
    private PostRepository postRepository;

    // CREATE POST
    public Post creerPost(Post post) {
        post.setDateCreation(java.time.LocalDateTime.now());
        return postRepository.save(post);
    }

    // GET ALL
    public List<Post> getTousLesPosts() {
        return postRepository.findAllByOrderByDateCreationDesc();
    }

    // GET ONE
    public Post getPostById(String id) {
        return postRepository.findById(id).orElseThrow();
    }

    // DELETE
    public void supprimerPost(String id) {
        postRepository.deleteById(id);
    }

    // LIKE
    public Post likePost(String id) {
        Post post = postRepository.findById(id).orElseThrow();
        post.setLikes(post.getLikes() + 1);
        return postRepository.save(post);
    }

    // COMMENTAIRE
    public Post ajouterCommentaire(String postId, Commentaire commentaire) {

        Post post = postRepository.findById(postId).orElseThrow();

        commentaire.setId(UUID.randomUUID().toString());
        commentaire.setDateCreation(java.time.LocalDateTime.now());

        post.getCommentaires().add(commentaire);

        return postRepository.save(post);
    }
}