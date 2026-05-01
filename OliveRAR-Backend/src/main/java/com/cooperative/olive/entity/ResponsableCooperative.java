package com.cooperative.olive.entity;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.TypeAlias;

@Data
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
@TypeAlias("responsable_cooperative")
public class ResponsableCooperative extends User {
    // Specific methods from diagram could be added here as business logic or handled in service
}
