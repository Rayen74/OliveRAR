package com.cooperative.olive.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "vergers")
public class Verger {
    @Id
    private String id;
    private String nom;
    private String localisation;
    private double superficie;
    private int nombreArbres;
    private String typeOlive;
    private double latitude;
    private double longitude;
    private double rendementEstime;
    private String agriculteurId;
    private String statut; // "EN_CROISSANCE", "PRET_POUR_RECOLTE", "TERMINE"
    private LocalDateTime dateAlerteMaturite;
}