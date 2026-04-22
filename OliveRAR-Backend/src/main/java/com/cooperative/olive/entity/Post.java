package com.cooperative.olive.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Document(collection = "posts")
public class Post {

    @Id
    private String id;

    private String titre;
    private String contenu;
    private String imageUrl;

    private LocalDateTime dateCreation = LocalDateTime.now();

    private String agriculteurId;
    private String agriculteurNom;
    private String agriculteurPhoto;

    private List<Commentaire> commentaires = new ArrayList<>();

    private Set<String> likedBy = new HashSet<>();
    private String imagePost;

    // Getters & Setters

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitre() { return titre; }
    public void setTitre(String titre) { this.titre = titre; }

    public String getContenu() { return contenu; }
    public void setContenu(String contenu) { this.contenu = contenu; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public LocalDateTime getDateCreation() { return dateCreation; }
    public void setDateCreation(LocalDateTime dateCreation) { this.dateCreation = dateCreation; }

    public String getAgriculteurId() { return agriculteurId; }
    public void setAgriculteurId(String agriculteurId) { this.agriculteurId = agriculteurId; }

    public String getAgriculteurNom() { return agriculteurNom; }
    public void setAgriculteurNom(String agriculteurNom) { this.agriculteurNom = agriculteurNom; }

    public List<Commentaire> getCommentaires() { return commentaires; }
    public void setCommentaires(List<Commentaire> commentaires) { this.commentaires = commentaires; }

    public Set<String> getLikedBy() { return likedBy; }
    public void setLikedBy(Set<String> likedBy) { this.likedBy = likedBy; }

    public int getLikes() { return likedBy != null ? likedBy.size() : 0; }

    public String getAgriculteurPhoto() { return agriculteurPhoto; }
    public void setAgriculteurPhoto(String agriculteurPhoto) { this.agriculteurPhoto = agriculteurPhoto; }

    public String getImagePost() { return imagePost; }
    public void setImagePost(String imagePost) { this.imagePost = imagePost; }
}