package com.cooperative.olive.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "resources")
public class Resource {
    @Id
    private String id;

    @NotBlank(message = "Le nom de la ressource est obligatoire.")
    private String name;

    // Changement : String -> ResourceType
    @NotNull(message = "Le type de ressource est obligatoire.")
    private ResourceCategorie categorie;

    // Changement : String -> ResourceStatus
    @NotNull(message = "Le statut est obligatoire.")
    private ResourceStatus status;
    private String imageUrl;
    private String code;
    private String description;
}