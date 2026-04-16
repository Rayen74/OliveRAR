package com.cooperative.olive.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "commentaires")
public class Commentaire {
    @Id
    private String id;
    private String postId;
    private String contenu;
    private String agriculteurId;
    private String nomAgriculteur;
    private String prenomAgriculteur;
    private LocalDateTime createdAt;
}