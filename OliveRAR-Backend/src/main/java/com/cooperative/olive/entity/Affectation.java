package com.cooperative.olive.entity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Affectation {
    @NotBlank(message = "L'ID de la cible est obligatoire.")
    private String cibleId; // ID of Unite or User

    @NotBlank(message = "Le type de cible est obligatoire (MACHINE ou HUMAIN).")
    private String typeCible; // "MACHINE" or "HUMAIN"

    private String niveau; // "TOURNEE" or "COLLECTE"

    @NotNull(message = "La date de debut est obligatoire.")
    private LocalDateTime startTime;

    @NotNull(message = "La date de fin est obligatoire.")
    private LocalDateTime endTime;

    @NotBlank(message = "Le statut de reservation est obligatoire.")
    private String statutReservation = "PLANIFIEE"; // PLANIFIEE, CONFIRMEE, ANNULEE

    private String statutOperationnel = "EN_ATTENTE"; // EN_ATTENTE, EN_TRANSIT, SUR_SITE, PANNE, TERMINEE
}
