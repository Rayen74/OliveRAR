package com.cooperative.olive.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "verger_issues")
public class VergerIssue {
    @Id
    private String id;

    @NotBlank(message = "Le vergerId est obligatoire.")
    private String vergerId;

    @NotBlank(message = "Le type de problème est obligatoire.")
    private String type; // MALADIE, IRRIGATION, RAVAGEUR, METEO, AUTRE

    @NotBlank(message = "La description est obligatoire.")
    private String description;

    @NotBlank(message = "La gravité est obligatoire.")
    private String gravite; // FAIBLE, MOYENNE, CRITIQUE

    @NotBlank(message = "Le statut est obligatoire.")
    private String statut; // SIGNALE, EN_COURS, RESOLU

    private LocalDateTime dateSignalement;
    private String signalePar; // userId
    private List<String> photos = new ArrayList<>();
    private String notes;

    private List<HistoriqueIssue> historique = new ArrayList<>();

    private boolean deleted = false;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class HistoriqueIssue {
        private LocalDateTime date;
        private String action;
        private String ancienStatut;
        private String nouveauStatut;
        private String userId;
    }
}
