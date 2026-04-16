package com.cooperative.olive.controller;

import com.cooperative.olive.entity.Commentaire;
import com.cooperative.olive.entity.Post;
import com.cooperative.olive.service.PostService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/posts")
@CrossOrigin(origins = "*")
public class PostController {

    @Autowired
    private PostService postService;

    // CREATE
    @PostMapping
    public ResponseEntity<Post> creerPost(@RequestBody Post post) {
        return ResponseEntity.ok(postService.creerPost(post));
    }

    // GET ALL
    @GetMapping
    public ResponseEntity<List<Post>> getPosts() {
        return ResponseEntity.ok(postService.getTousLesPosts());
    }

    // GET ONE
    @GetMapping("/{id}")
    public ResponseEntity<Post> getPost(@PathVariable String id) {
        return ResponseEntity.ok(postService.getPostById(id));
    }

    // DELETE
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        postService.supprimerPost(id);
        return ResponseEntity.noContent().build();
    }

    // LIKE
    @PutMapping("/{id}/like")
    public ResponseEntity<Post> like(@PathVariable String id) {
        return ResponseEntity.ok(postService.likePost(id));
    }

    // COMMENTER
    @PostMapping("/{id}/commentaires")
    public ResponseEntity<Post> commenter(
            @PathVariable String id,
            @RequestBody Commentaire commentaire) {

        return ResponseEntity.ok(
                postService.ajouterCommentaire(id, commentaire)
        );
    }
}