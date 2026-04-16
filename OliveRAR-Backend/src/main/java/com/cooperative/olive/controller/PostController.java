    package com.cooperative.olive.controller;

    import com.cooperative.olive.entity.Commentaire;
    import com.cooperative.olive.entity.Post;
    import com.cooperative.olive.service.PostService;
    import lombok.RequiredArgsConstructor;
    import org.springframework.http.HttpStatus;
    import org.springframework.http.ResponseEntity;
    import org.springframework.security.core.annotation.AuthenticationPrincipal;
    import org.springframework.security.core.userdetails.UserDetails;
    import org.springframework.web.bind.annotation.*;

    import java.util.List;
    import java.util.Map;

    @RestController
    @RequestMapping("/api/communaute")
    @RequiredArgsConstructor
    public class PostController {

        private final PostService postService;

        // Helper pour vérifier l'authentification et éviter les répétitions
        private void verifierAuthentification(UserDetails user) {
            if (user == null) {
                throw new org.springframework.security.access.AccessDeniedException("Utilisateur non authentifié");
            }
        }

        // ─── POSTS ───────────────────────────────────────────

        @GetMapping("/posts")
        public ResponseEntity<List<Post>> getTous(
                @RequestParam(required = false) String categorie,
                @RequestParam(required = false) String region) {
            if (categorie != null) return ResponseEntity.ok(postService.getPostsParCategorie(categorie));
            if (region != null) return ResponseEntity.ok(postService.getPostsParRegion(region));
            return ResponseEntity.ok(postService.getTousLesPosts());
        }

        @GetMapping("/posts/{id}")
        public ResponseEntity<Post> getPost(@PathVariable String id) {
            return ResponseEntity.ok(postService.getPost(id));
        }

        @GetMapping("/mes-posts")
        public ResponseEntity<List<Post>> getMesPosts(@AuthenticationPrincipal UserDetails user) {
            verifierAuthentification(user);
            return ResponseEntity.ok(postService.getMesPosts(user.getUsername()));
        }

        @PostMapping("/posts")
        public ResponseEntity<Post> creer(@RequestBody Post post,
                                          @AuthenticationPrincipal UserDetails user) {
            verifierAuthentification(user);
            System.out.println("Création de post par : " + user.getUsername());
            return ResponseEntity.ok(postService.creerPost(post, user.getUsername()));
        }

        @PutMapping("/posts/{id}")
        public ResponseEntity<Post> modifier(@PathVariable String id,
                                             @RequestBody Post post,
                                             @AuthenticationPrincipal UserDetails user) {
            verifierAuthentification(user);
            return ResponseEntity.ok(postService.modifierPost(id, post, user.getUsername()));
        }

        @DeleteMapping("/posts/{id}")
        public ResponseEntity<?> supprimer(@PathVariable String id,
                                           @AuthenticationPrincipal UserDetails user) {
            verifierAuthentification(user);
            postService.supprimerPost(id, user.getUsername());
            return ResponseEntity.ok(Map.of("message", "Post supprimé"));
        }

        // ─── LIKES ───────────────────────────────────────────

        @PostMapping("/posts/{id}/like")
        public ResponseEntity<Post> like(@PathVariable String id,
                                         @AuthenticationPrincipal UserDetails user) {
            verifierAuthentification(user);
            return ResponseEntity.ok(postService.toggleLike(id, user.getUsername()));
        }

        // ─── COMMENTAIRES ────────────────────────────────────

        @GetMapping("/posts/{postId}/commentaires")
        public ResponseEntity<List<Commentaire>> getCommentaires(@PathVariable String postId) {
            return ResponseEntity.ok(postService.getCommentaires(postId));
        }

        @PostMapping("/posts/{postId}/commentaires")
        public ResponseEntity<Commentaire> commenter(@PathVariable String postId,
                                                     @RequestBody Map<String, String> body,
                                                     @AuthenticationPrincipal UserDetails user) {
            verifierAuthentification(user);
            return ResponseEntity.ok(
                    postService.ajouterCommentaire(postId, body.get("contenu"), user.getUsername())
            );
        }

        @DeleteMapping("/commentaires/{id}")
        public ResponseEntity<?> supprimerCommentaire(@PathVariable String id,
                                                      @AuthenticationPrincipal UserDetails user) {
            verifierAuthentification(user);
            postService.supprimerCommentaire(id, user.getUsername());
            return ResponseEntity.ok(Map.of("message", "Commentaire supprimé"));
        }

        // Gestion locale de l'exception si l'utilisateur est null
        @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
        public ResponseEntity<Map<String, String>> handleAccessDenied(Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Vous devez être connecté pour effectuer cette action"));
        }
    }