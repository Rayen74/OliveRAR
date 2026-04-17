package com.cooperative.olive.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "orchards")
public class Orchard {
    @Id
    private String id;
    private String name;
    private String location;
    private String status;
    private Double superficie;
    private String agriculteurId; // lien avec l'agriculteur
}