package com.cooperative.olive.service;

import com.cooperative.olive.dao.CommentaireRepository;
import com.cooperative.olive.dao.PostRepository;
import com.cooperative.olive.dao.UserRepository;
import com.cooperative.olive.entity.Commentaire;
import com.cooperative.olive.entity.Post;
import com.cooperative.olive.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PostService {

    private final PostRepository postRepository;
    private final CommentaireRepository commentaireRepository;
    private final UserRepository userRepository;
    private final AlertService alertService;

    // ─── POSTS ───────────────────────────────────────────

    public Post creerPost(Post post, String agriculteurId) {
        User user = userRepository.findById(agriculteurId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        post.setAgriculteurId(agriculteurId);
        post.setNomAgriculteur(user.getNom());
        post.setPrenomAgriculteur(user.getPrenom());
        post.setCreatedAt(LocalDateTime.now());
        post.setUpdatedAt(LocalDateTime.now());

        return postRepository.save(post);
    }

    public List<Post> getTousLesPosts() {
        return postRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<Post> getPostsParCategorie(String categorie) {
        return postRepository.findByCategorieOrderByCreatedAtDesc(categorie);
    }

    public List<Post> getPostsParRegion(String region) {
        return postRepository.findByRegionOrderByCreatedAtDesc(region);
    }

    public List<Post> getMesPosts(String agriculteurId) {
        return postRepository.findByAgriculteurIdOrderByCreatedAtDesc(agriculteurId);
    }

    public Post getPost(String id) {
        return postRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Post non trouvé"));
    }

    public Post modifierPost(String id, Post updated, String agriculteurId) {
        Post post = getPost(id);
        if (!post.getAgriculteurId().equals(agriculteurId)) {
            throw new RuntimeException("Non autorisé");
        }
        post.setTitre(updated.getTitre());
        post.setContenu(updated.getContenu());
        post.setCategorie(updated.getCategorie());
        post.setRegion(updated.getRegion());
        post.setUpdatedAt(LocalDateTime.now());
        return postRepository.save(post);
    }

    public void supprimerPost(String id, String agriculteurId) {
        Post post = getPost(id);
        if (!post.getAgriculteurId().equals(agriculteurId)) {
            throw new RuntimeException("Non autorisé");
        }
        commentaireRepository.deleteByPostId(id);
        postRepository.deleteById(id);
    }

    // ─── LIKES ───────────────────────────────────────────

    public Post toggleLike(String postId, String agriculteurId) {
        Post post = getPost(postId);
        if (post.getLikes().contains(agriculteurId)) {
            post.getLikes().remove(agriculteurId);
        } else {
            post.getLikes().add(agriculteurId);
        }
        return postRepository.save(post);
    }

    // ─── COMMENTAIRES ────────────────────────────────────

    public Commentaire ajouterCommentaire(String postId, String contenu, String agriculteurId) {
        User user = userRepository.findById(agriculteurId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        Post post = getPost(postId);

        Commentaire commentaire = new Commentaire();
        commentaire.setPostId(postId);
        commentaire.setContenu(contenu);
        commentaire.setAgriculteurId(agriculteurId);
        commentaire.setNomAgriculteur(user.getNom());
        commentaire.setPrenomAgriculteur(user.getPrenom());
        commentaire.setCreatedAt(LocalDateTime.now());

        // Incrémenter le nombre de commentaires
        post.setNombreCommentaires(post.getNombreCommentaires() + 1);
        postRepository.save(post);

        // Notification au propriétaire du post
        if (!post.getAgriculteurId().equals(agriculteurId)) {
            alertService.envoyerNotificationCommentaire(
                    post,
                    user.getPrenom() + " " + user.getNom()
            );
        }

        return commentaireRepository.save(commentaire);
    }

    public List<Commentaire> getCommentaires(String postId) {
        return commentaireRepository.findByPostIdOrderByCreatedAtAsc(postId);
    }

    public void supprimerCommentaire(String commentaireId, String agriculteurId) {
        Commentaire c = commentaireRepository.findById(commentaireId)
                .orElseThrow(() -> new RuntimeException("Commentaire non trouvé"));
        if (!c.getAgriculteurId().equals(agriculteurId)) {
            throw new RuntimeException("Non autorisé");
        }
        Post post = getPost(c.getPostId());
        post.setNombreCommentaires(Math.max(0, post.getNombreCommentaires() - 1));
        postRepository.save(post);
        commentaireRepository.deleteById(commentaireId);
    }
}