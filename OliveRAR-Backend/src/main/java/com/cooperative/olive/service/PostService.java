package com.cooperative.olive.service;

import com.cooperative.olive.dao.PostRepository;
import com.cooperative.olive.dao.UserRepository;
import com.cooperative.olive.entity.Commentaire;
import com.cooperative.olive.entity.Post;
import com.cooperative.olive.entity.User;
import com.cooperative.olive.exception.ForbiddenOperationException;
import com.cooperative.olive.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class PostService {

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private UserRepository userRepository;

    public Post creerPost(Post post) {
        User user = userRepository.findById(post.getAgriculteurId())
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé."));

        post.setDateCreation(LocalDateTime.now());
        post.setAgriculteurNom(user.getNom() + " " + user.getPrenom());
        post.setAgriculteurPhoto(user.getImageUrl());

        return postRepository.save(post);
    }

    public List<Post> getTousLesPosts() {
        return postRepository.findAllByOrderByDateCreationDesc();
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

    public Post likePost(String id) {
        Post post = getPostById(id);
        post.setLikes(post.getLikes() + 1);
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
}
