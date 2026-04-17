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
@Document(collection = "alerts")
public class Alert {
    @Id
    private String id;
    private String type;
    private String description;
    private String timestamp;

    // Infos verger
    private String vergerId;
    private String nomVerger;
    private String localisationVerger;
    private double rendementEstime;
    private String typeOlive;
    private int nombreArbres;
    private double superficie;

    // Infos agriculteur
    private String agriculteurId;
    private String nomAgriculteur;
    private String prenomAgriculteur;

    private String destinataireRole;
    private boolean lu;
    private LocalDateTime createdAt;
}