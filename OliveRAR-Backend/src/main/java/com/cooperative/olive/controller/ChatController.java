package com.cooperative.olive.controller;

import com.cooperative.olive.entity.User;
import com.cooperative.olive.security.CurrentUserService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private static final String N8N_WEBHOOK_URL = 
        "http://localhost:5678/webhook/f31a08fe-32ef-4d37-8a2a-ee0cf5480bf0/chat";

    private final CurrentUserService currentUserService;
    private final RestTemplate restTemplate;

    // ✅ Removed PlanningService — let n8n fetch data via tools

    @PostMapping
    public ResponseEntity<?> chat(@RequestBody(required = false) String bodyStr) {
        User user = currentUserService.getRequiredCurrentUser();

        if (bodyStr == null || bodyStr.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("reply", "Message vide."));
        }

        Map<String, Object> body;
        try {
            ObjectMapper mapper = new ObjectMapper();
            body = mapper.readValue(bodyStr, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            body = Map.of("message", bodyStr);
        }

        // ✅ Clean payload — only identity info, NO pre-fetched data
        Map<String, Object> n8nPayload = Map.of(
            "chatInput",  body.getOrDefault("message", ""),
            "sessionId",  String.valueOf(user.getId()),
            "userId",     String.valueOf(user.getId()),
            "userName",   user.getPrenom() + " " + user.getNom(),
            "userRole",   user.getRole().name()
        );

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> n8nResponse =
                restTemplate.postForObject(N8N_WEBHOOK_URL, n8nPayload, Map.class);

            String reply = extractReply(n8nResponse);
            return ResponseEntity.ok(Map.of("reply", reply));

        } catch (Exception e) {
            System.err.println("[ChatController] Erreur: " + e.getMessage());
            return ResponseEntity.ok(Map.of(
                "reply", "Le service IA est temporairement indisponible."
            ));
        }
    }

    private String extractReply(Map<String, Object> response) {
        if (response == null) return "Pas de réponse reçue.";
        for (String key : new String[]{"output", "reply", "text", "message"}) {
            Object val = response.get(key);
            if (val != null) return String.valueOf(val);
        }
        return "Réponse non exploitable.";
    }
}