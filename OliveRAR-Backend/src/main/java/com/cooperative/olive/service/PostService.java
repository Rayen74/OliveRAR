package com.cooperative.olive.service;

import com.cooperative.olive.dao.PostRepository;
import com.cooperative.olive.dao.UserRepository;
import com.cooperative.olive.entity.Commentaire;
import com.cooperative.olive.entity.Post;
import com.cooperative.olive.entity.User;

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

    // --- GESTION DES PUBLICATIONS (POSTS) ---

    /**
     * Crée un nouveau post et définit la date de création actuelle.
     */
    public Post creerPost(Post post) {
        // 1. Récupérer l'utilisateur depuis la base (via l'ID envoyé par le front)
        User user = userRepository.findById(post.getAgriculteurId())
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        // 2. Enrichir le post avec les données de l'utilisateur
        post.setDateCreation(LocalDateTime.now());
        post.setAgriculteurNom(user.getNom() + " " + user.getPrenom());

        // ICI : On récupère l'URL de l'image pour le post
        post.setAgriculteurPhoto(user.getImageUrl());

        return postRepository.save(post);
    }

    /**
     * Récupère tous les posts triés du plus récent au plus ancien.
     */
    public List<Post> getTousLesPosts() {
        return postRepository.findAllByOrderByDateCreationDesc();
    }

    /**
     * Récupère un post spécifique par son identifiant unique.
     */
    public Post getPostById(String id) {
        return postRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Post non trouvé avec l'id : " + id));
    }

    /**
     * Supprime un post après avoir vérifié que le demandeur est bien l'auteur.
     * Note: Dans un système complet, userIdDemandeur viendrait du Token de sécurité (JWT).
     */
    public void supprimerPostSecurise(String id, String userIdDemandeur) {
        Post post = getPostById(id);

        // Vérification de sécurité
        if (!post.getAgriculteurId().equals(userIdDemandeur)) {
            throw new RuntimeException("Action interdite : Vous ne pouvez pas supprimer le post d'un autre membre.");
        }

        postRepository.deleteById(id);
    }


    /**
     * Supprime définitivement un post de la base de données.
     */
    public void supprimerPost(String id) {
        postRepository.deleteById(id);
    }

    /**
     * Incrémente le compteur de likes d'une publication.
     */
    public Post likePost(String id) {
        Post post = getPostById(id);
        post.setLikes(post.getLikes() + 1);
        return postRepository.save(post);
    }

    // --- GESTION DES COMMENTAIRES ---

    /**
     * Ajoute un commentaire enrichi avec les informations de profil de l'agriculteur.
     * Cette méthode récupère le nom complet et l'imageUrl de l'utilisateur pour le frontend.
     */
    public Post ajouterCommentaire(String postId, Commentaire commentaire) {
        // 1. Récupération du post cible
        Post post = getPostById(postId);

        // 2. Récupération des informations de l'agriculteur qui commente
        User user = userRepository.findById(commentaire.getAgriculteurId())
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec l'id : " + commentaire.getAgriculteurId()));

        // 3. Initialisation et enrichissement du commentaire (Dénormalisation)
        commentaire.setId(UUID.randomUUID().toString());
        commentaire.setDateCreation(LocalDateTime.now());

        // On combine Nom et Prénom pour l'affichage complet demandé
        commentaire.setAgriculteurNom(user.getNom() + " " + user.getPrenom());

        // On récupère l'URL de l'image de profil définie dans l'entité User
        commentaire.setAgriculteurPhoto(user.getImageUrl());

        // 4. Ajout à la liste des commentaires du post et sauvegarde MongoDB
        post.getCommentaires().add(commentaire);

        return postRepository.save(post);
    }
}