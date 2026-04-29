package com.cooperative.olive.entity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "tournees")
public class Tournee {
    @Id
    private String id;

    @NotBlank(message = "Le nom de la tournee est obligatoire.")
    private String name;

    @NotEmpty(message = "Une tournee doit contenir au moins deux collectes.")
    private List<String> collecteIds = new ArrayList<>();

    private LocalDate datePrevue;
    private LocalDateTime plannedStartTime;
    private LocalDateTime plannedEndTime;
    private Boolean optimizationEnabled;
    private List<ResourceAssignment> resourceAssignments = new ArrayList<>();

    @NotBlank(message = "Le statut de la tournee est obligatoire.")
    private String status = "PLANIFIEE";

    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
