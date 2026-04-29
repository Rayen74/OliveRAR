package com.cooperative.olive.entity;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResourceAssignment {
    @NotBlank(message = "L'unité de ressource est obligatoire.")
    private String uniteId;

    @NotNull(message = "La date de debut est obligatoire.")
    private LocalDateTime startTime;

    @NotNull(message = "La date de fin est obligatoire.")
    private LocalDateTime endTime;

    @NotBlank(message = "Le statut de l'affectation est obligatoire.")
    private String status;
}
