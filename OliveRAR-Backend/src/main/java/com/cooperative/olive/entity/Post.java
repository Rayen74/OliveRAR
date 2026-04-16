    package com.cooperative.olive.entity;

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
    @Document(collection = "posts")
    public class Post {
        @Id
        private String id;
        private String titre;
        private String contenu;
        private String categorie; // MALADIE, METEO, PRIX, TECHNIQUE, MATERIEL
        private String region;    // Sfax, Tunis, Mahdia...
        private String agriculteurId;
        private String nomAgriculteur;
        private String prenomAgriculteur;
        private String photoUrl;  // optionnel
        private List<String> likes = new ArrayList<>(); // liste des agriculteurId
        private int nombreCommentaires = 0;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }