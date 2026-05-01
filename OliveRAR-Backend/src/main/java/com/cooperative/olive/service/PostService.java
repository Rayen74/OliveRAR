package com.cooperative.olive.service;

import com.cooperative.olive.dao.PostRepository;
import com.cooperative.olive.dao.UserRepository;
import com.cooperative.olive.entity.Commentaire;
import com.cooperative.olive.entity.Post;
import com.cooperative.olive.entity.User;
import com.cooperative.olive.exception.ForbiddenOperationException;
import com.cooperative.olive.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.UUID;

@Service
public class PostService {

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ImageService imageService;

    public Post creerPost(Post post, MultipartFile file) {
        User user = userRepository.findById(post.getAgriculteurId())
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé."));

        post.setDateCreation(LocalDateTime.now());
        post.setAgriculteurNom(user.getNom() + " " + user.getPrenom());
        post.setAgriculteurPhoto(user.getImageUrl());

        if (file != null && !file.isEmpty()) {
            try {
                String imageUrl = imageService.uploadImage(file);
                post.setImagePost(imageUrl);
            } catch (IOException e) {
                // Ignore upload error or handle it
                post.setImagePost(null);
            }
        }

        return postRepository.save(post);
    }

    public Page<Post> getTousLesPosts(Pageable pageable) {
        return postRepository.findAllByOrderByDateCreationDesc(pageable);
    }

    public Post getPostById(String id) {
        return postRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Post non trouvé avec l'id : " + id));
    }

    public void supprimerPostSecurise(String id, String userIdDemandeur) {
        Post post = getPostById(id);
        if (!post.getAgriculteurId().equals(userIdDemandeur)) {
            throw new ForbiddenOperationException("Action interdite : vous ne pouvez pas supprimer le post d'un autre membre.");
        }

        postRepository.deleteById(id);
    }

    public void supprimerPost(String id) {
        postRepository.deleteById(id);
    }

    public Post likePost(String id, String userId) {
        Post post = getPostById(id);
        if (post.getLikedBy() == null) {
            post.setLikedBy(new HashSet<>());
        }
        if (post.getLikedBy().contains(userId)) {
            post.getLikedBy().remove(userId);
        } else {
            post.getLikedBy().add(userId);
        }
        return postRepository.save(post);
    }

    public Post ajouterCommentaire(String postId, Commentaire commentaire) {
        Post post = getPostById(postId);

        User user = userRepository.findById(commentaire.getAgriculteurId())
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé avec l'id : " + commentaire.getAgriculteurId()));

        commentaire.setId(UUID.randomUUID().toString());
        commentaire.setDateCreation(LocalDateTime.now());
        commentaire.setAgriculteurNom(user.getNom() + " " + user.getPrenom());
        commentaire.setAgriculteurPhoto(user.getImageUrl());

        post.getCommentaires().add(commentaire);
        return postRepository.save(post);
    }

    public void supprimerCommentaire(String postId, String commentaireId, String userIdDemandeur) {
        Post post = getPostById(postId);
        
        Commentaire commentaireASupprimer = post.getCommentaires().stream()
                .filter(c -> c.getId().equals(commentaireId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Commentaire non trouvé."));

        // Autoriser la suppression si l'utilisateur est l'auteur du commentaire OU l'auteur du post
        if (!commentaireASupprimer.getAgriculteurId().equals(userIdDemandeur) && 
            !post.getAgriculteurId().equals(userIdDemandeur)) {
            throw new ForbiddenOperationException("Action interdite : vous ne pouvez pas supprimer ce commentaire.");
        }

        post.getCommentaires().removeIf(c -> c.getId().equals(commentaireId));
        postRepository.save(post);
    }
}
