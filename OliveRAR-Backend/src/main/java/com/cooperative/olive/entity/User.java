package com.cooperative.olive.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.cooperative.olive.validation.ValidationPatterns;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "users")
public class User {
    @Id
    private String id;

    @NotBlank(message = "Le nom est obligatoire.")
    private String nom;

    @NotBlank(message = "Le prénom est obligatoire.")
    private String prenom;

    @NotBlank(message = "L'email est obligatoire.")
    @Email(message = "Le format de l'email est invalide.")
    private String email;

    @NotBlank(message = "Le numéro de téléphone est obligatoire.")
    @Pattern(regexp = ValidationPatterns.PHONE_NUMBER, message = "Le numéro de téléphone doit contenir exactement 8 chiffres.")
    private String phoneNumber;
    private String imageUrl;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @NotBlank(message = "Le mot de passe est obligatoire.")
    private String password;

    private Role role;

    private String resetToken;
    private Instant resetTokenExpiry;
}
