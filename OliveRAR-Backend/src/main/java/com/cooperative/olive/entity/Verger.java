package com.cooperative.olive.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
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

    @NotBlank(message = "Le nom du verger est obligatoire.")
    private String nom;

    @NotBlank(message = "La localisation du verger est obligatoire.")
    private String localisation;

    @Positive(message = "La superficie doit être positive.")
    private double superficie;

    @Positive(message = "Le nombre d'arbres doit être positif.")
    private int nombreArbres;

    @NotBlank(message = "Le type d'olive est obligatoire.")
    private String typeOlive;

    @DecimalMin(value = "-90.0", message = "La latitude doit être supérieure ou égale à -90.")
    @DecimalMax(value = "90.0", message = "La latitude doit être inférieure ou égale à 90.")
    private double latitude;

    @DecimalMin(value = "-180.0", message = "La longitude doit être supérieure ou égale à -180.")
    @DecimalMax(value = "180.0", message = "La longitude doit être inférieure ou égale à 180.")
    private double longitude;

    @Positive(message = "Le rendement estimé doit être positif.")
    private double rendementEstime;

    @NotBlank(message = "L'agriculteur propriétaire est obligatoire.")
    private String agriculteurId;

    @NotBlank(message = "Le statut du verger est obligatoire.")
    private String statut; // "EN_CROISSANCE", "PRET_POUR_RECOLTE", "TERMINE"
    private LocalDateTime dateAlerteMaturite;
}
