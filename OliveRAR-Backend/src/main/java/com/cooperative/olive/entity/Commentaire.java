package com.cooperative.olive.entity;

import java.time.LocalDateTime;

public class Commentaire {

    private String id;
    private String contenu;
    private LocalDateTime dateCreation = LocalDateTime.now();

    private String agriculteurId;
    private String agriculteurNom;

    // Getters & Setters

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getContenu() { return contenu; }
    public void setContenu(String contenu) { this.contenu = contenu; }

    public LocalDateTime getDateCreation() { return dateCreation; }
    public void setDateCreation(LocalDateTime dateCreation) { this.dateCreation = dateCreation; }

    public String getAgriculteurId() { return agriculteurId; }
    public void setAgriculteurId(String agriculteurId) { this.agriculteurId = agriculteurId; }

    public String getAgriculteurNom() { return agriculteurNom; }
    public void setAgriculteurNom(String agriculteurNom) { this.agriculteurNom = agriculteurNom; }
}