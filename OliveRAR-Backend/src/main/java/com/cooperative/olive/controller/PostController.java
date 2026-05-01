package com.cooperative.olive.controller;

import com.cooperative.olive.entity.Commentaire;
import com.cooperative.olive.entity.Post;
import com.cooperative.olive.service.PostService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.web.multipart.MultipartFile;


@RestController
@RequestMapping("/api/posts")
@CrossOrigin(origins = "*")
public class PostController {

    @Autowired
    private PostService postService;

    // CREATE
    @PostMapping
    public ResponseEntity<Post> creerPost(
            @RequestPart("post") Post post,
            @RequestPart(value = "file", required = false) MultipartFile file) {
        return ResponseEntity.ok(postService.creerPost(post, file));
    }

    // GET ALL
    @GetMapping
    public ResponseEntity<Page<Post>> getPosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(postService.getTousLesPosts(pageable));
    }

    // GET ONE
    @GetMapping("/{id}")
    public ResponseEntity<Post> getPost(@PathVariable String id) {
        return ResponseEntity.ok(postService.getPostById(id));
    }

    // DELETE
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, @RequestHeader("X-User-Id") String userId) {
        postService.supprimerPostSecurise(id, userId);
        return ResponseEntity.noContent().build();
    }

    // LIKE
    @PutMapping("/{id}/like")
    public ResponseEntity<Post> like(@PathVariable String id, @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(postService.likePost(id, userId));
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

    // DELETE COMMENTAIRE
    @DeleteMapping("/{postId}/commentaires/{commentaireId}")
    public ResponseEntity<Void> supprimerCommentaire(
            @PathVariable String postId,
            @PathVariable String commentaireId,
            @RequestHeader("X-User-Id") String userId) {
        
        postService.supprimerCommentaire(postId, commentaireId, userId);
        return ResponseEntity.noContent().build();
    }
}