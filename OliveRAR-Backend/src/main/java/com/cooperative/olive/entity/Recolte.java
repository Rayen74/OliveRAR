package com.cooperative.olive.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "recoltes")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Recolte {
    @Id
    private String id;
    
    @Indexed(unique = true, sparse = true)
    private String tourId; // Référence à la tournée
    
    private String chefId; // ID du Responsable Collecte (pour filtrage RBAC)
    
    private LocalDateTime dateEnregistrement;
    
    // Données de production
    private Double quantiteOliveKg;
    private String vergerId;
    
    // Objets embarqués
    @Builder.Default
    private List<WorkerAttendance> attendance = new ArrayList<>();
    
    @Builder.Default
    private List<ResourceCheck> resourceChecks = new ArrayList<>();
    
    private String notesGlobales;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WorkerAttendance {
        private String workerId;
        private String workerName; // Dénormalisation légère pour les rapports
        private AttendanceStatus statut; // Enum: PRESENT, ABSENT, RETARD
        private LocalDateTime heurePointage;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ResourceCheck {
        private String resourceUnitId;
        private String label;
        @Builder.Default
        private List<ChecklistItem> items = new ArrayList<>();
        private UniteStatut statutGlobal; // Enum: DISPONIBLE, AFFECTE, EN_MAINTENANCE, EN_PANNE, HORS_SERVICE
        private String noteIncident;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ChecklistItem {
        private String label;
        private boolean checked;
    }
}
