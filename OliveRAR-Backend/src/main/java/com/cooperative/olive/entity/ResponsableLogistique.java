package com.cooperative.olive.entity;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.TypeAlias;

@Data
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
@TypeAlias("responsable_logistique")
public class ResponsableLogistique extends User {
}
