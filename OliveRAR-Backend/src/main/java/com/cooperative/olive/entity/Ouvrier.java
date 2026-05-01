package com.cooperative.olive.entity;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.TypeAlias;

/**
 * Ouvrier — membre de l'équipe de récolte.
 * Disponibilite : DISPONIBLE | OCCUPE | HORS_SERVICE
 */
@Data
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
@TypeAlias("ouvrier")
public class Ouvrier extends User {

    /** DISPONIBLE | OCCUPE | HORS_SERVICE */
    private String disponibilite = "DISPONIBLE";
}
