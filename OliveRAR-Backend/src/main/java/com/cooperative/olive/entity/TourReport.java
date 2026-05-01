package com.cooperative.olive.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "tour_reports")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TourReport {
    @Id
    private String id;
    private String tourId;
    private LocalDateTime dateRapport;
    private String creePar;
}
