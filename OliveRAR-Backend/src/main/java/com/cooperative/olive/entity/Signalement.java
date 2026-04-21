package com.cooperative.olive.entity;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "signalements")
public class Signalement {
    @Id
    private String id;

    @NotBlank(message = "Le verger est obligatoire.")
    private String vergerId;

    @NotBlank(message = "Le type d'incident est obligatoire.")
    private String issueType;

    @NotBlank(message = "La description est obligatoire.")
    private String description;

    private String imageUrl;

    @NotNull(message = "La latitude est obligatoire.")
    @DecimalMin(value = "-90.0", message = "La latitude doit être supérieure ou égale à -90.")
    @DecimalMax(value = "90.0", message = "La latitude doit être inférieure ou égale à 90.")
    private Double latitude;

    @NotNull(message = "La longitude est obligatoire.")
    @DecimalMin(value = "-180.0", message = "La longitude doit être supérieure ou égale à -180.")
    @DecimalMax(value = "180.0", message = "La longitude doit être inférieure ou égale à 180.")
    private Double longitude;

    @NotBlank(message = "Le statut est obligatoire.")
    private String status = "NOUVEAU";

    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<String> history = new ArrayList<>();
}
