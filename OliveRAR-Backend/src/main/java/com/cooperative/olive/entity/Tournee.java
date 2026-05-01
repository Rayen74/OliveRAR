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

    @NotEmpty(message = "Une tournée doit contenir au moins deux collectes.")
    private List<String> collecteIds = new ArrayList<>();
    private List<String> agentIds = new ArrayList<>();
    private List<String> resourcesIds = new ArrayList<>();

    private LocalDate datePrevue;

    @NotBlank(message = "Le statut de la tournée est obligatoire.")
    private String status = "PLANIFIEE";

    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
