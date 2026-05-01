package com.cooperative.olive.controller;

import com.cooperative.olive.entity.Tournee;
import com.cooperative.olive.service.TourneeService;
import com.cooperative.olive.util.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tournees")
@RequiredArgsConstructor
public class TourneeController {

    private final TourneeService tourneeService;

    // ✅ POUR FRONT ANGULAR
    @GetMapping
    public ApiResponse<List<Map<String, Object>>> getAll() {
        return ApiResponse.success("OK", tourneeService.getAll());
    }

    @GetMapping("/mes-tournees")
    public ApiResponse<List<Map<String, Object>>> mesTournees() {
        return ApiResponse.success("OK", tourneeService.getMesTournees());
    }

    @GetMapping("/calendar")
    public ApiResponse<List<Map<String, Object>>> calendar() {
        return ApiResponse.success("OK", tourneeService.getAll());
    }

    @PostMapping
    public ApiResponse<Tournee> create(@RequestBody Tournee tournee) {
        return ApiResponse.success("Créée", tourneeService.create(tournee));
    }

    @PutMapping("/{id}")
    public ApiResponse<Tournee> update(@PathVariable String id, @RequestBody Tournee tournee) {
        return ApiResponse.success("MAJ", tourneeService.update(id, tournee));
    }
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable String id) {
        tourneeService.delete(id);
        return ApiResponse.success("Supprimée");
    }
}