package com.cooperative.olive.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;
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

    @NotBlank(message = "Le type de ressource est obligatoire.")
    private String type;

    private boolean available;

    private String code;
    private String status;
    private String description;
}
