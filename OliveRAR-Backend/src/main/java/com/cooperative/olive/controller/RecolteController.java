package com.cooperative.olive.controller;

import com.cooperative.olive.entity.Recolte;
import com.cooperative.olive.service.RecolteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@RestController
@RequestMapping("/api/recoltes")
@RequiredArgsConstructor
public class RecolteController {

    private final RecolteService recolteService;

    @PostMapping
    @PreAuthorize("hasRole('CHEF_RECOLTE')")
    public ResponseEntity<Recolte> saveRecolte(@RequestBody Recolte recolte) {
        return ResponseEntity.ok(recolteService.save(recolte));
    }

    @GetMapping("/tour/{tourId}")
    public ResponseEntity<Recolte> getByTourId(@PathVariable String tourId) {
        return recolteService.findOptionalByTourId(tourId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/tour/{tourId}/report")
    public ResponseEntity<byte[]> getReport(@PathVariable String tourId) throws IOException {
        String html = recolteService.generateReportHtml(tourId);
        byte[] contents = html.getBytes();
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.TEXT_HTML);
        String filename = "rapport_tournee_" + tourId + ".html";
        headers.setContentDispositionFormData(filename, filename);
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");
        
        return new ResponseEntity<>(contents, headers, HttpStatus.OK);
    }
}
