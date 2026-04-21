package com.cooperative.olive.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "collectes")
public class Collecte {

    @Id
    private String id;

    /** ID of the Verger (must have statut = PRET_POUR_RECOLTE) */
    @NotBlank(message = "Le verger est obligatoire.")
    private String vergerId;

    /** Planned date for the collection */
    @NotNull(message = "La date prévue est obligatoire.")
    @FutureOrPresent(message = "La date prévue doit être aujourd'hui ou dans le futur.")
    private LocalDate datePrevue;

    /** ID of the user with role RESPONSABLE_LOGISTIQUE */
    private String responsableAffectationId;

    /** ID of the user with role RESPONSABLE_CHEF_RECOLTE */
    @NotBlank(message = "Le chef de récolte est obligatoire.")
    private String chefRecolteId;

    /** IDs of users with role OUVRIER */
    private List<String> equipeIds = new ArrayList<>();

    /** Statut: PLANIFIEE | EN_COURS | TERMINEE | ANNULEE */
    @NotBlank(message = "Le statut de la collecte est obligatoire.")
    private String statut = "PLANIFIEE";

    /** ID of the RESPONSABLE_COOPERATIVE who created this collecte */
    private String createdBy;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
