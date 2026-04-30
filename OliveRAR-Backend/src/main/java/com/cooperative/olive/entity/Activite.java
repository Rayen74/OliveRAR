package com.cooperative.olive.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "activites")
public class Activite {

    @Id
    private String id;

    @Indexed
    private String userId;

    private String userNom;
    private String userRole;

    private ActiviteType type;
    private String module;
    private String description;

    private String entiteId;
    private String entiteNom;

    @Indexed
    private Instant dateAction;

    /** Données contextuelles supplémentaires (champs optionnels libres). */
    private Map<String, Object> details;
}
