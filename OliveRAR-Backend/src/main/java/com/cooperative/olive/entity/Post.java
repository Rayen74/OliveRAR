package com.cooperative.olive.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

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

    private List<Commentaire> commentaires = new ArrayList<>();

    private int likes = 0;

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

    public int getLikes() { return likes; }
    public void setLikes(int likes) { this.likes = likes; }
}