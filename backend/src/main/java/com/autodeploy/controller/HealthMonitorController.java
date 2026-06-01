package com.autodeploy.controller;

import com.autodeploy.dto.ApiResponse;
import com.autodeploy.model.HealthCheck;
import com.autodeploy.service.HealthMonitorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Tag(name = "Health", description = "Monitorizacion del estado de salud de los servidores")
@RestController
@RequestMapping("/api/health")
@PreAuthorize("isAuthenticated()")
public class HealthMonitorController {

    private final HealthMonitorService healthMonitorService;

    public HealthMonitorController(HealthMonitorService healthMonitorService) {
        this.healthMonitorService = healthMonitorService;
    }

    @Operation(summary = "Estado de salud de todos los servidores (solo ADMIN)")
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<HealthCheck>>> obtenerEstadoGeneral() {
        List<HealthCheck> listaDeEstados = healthMonitorService.obtenerEstadoTodosLosServidores();

        ApiResponse<List<HealthCheck>> cuerpo = new ApiResponse<>(true, "OK", listaDeEstados);
        return ResponseEntity.ok(cuerpo);
    }

    @Operation(summary = "Estado de salud de un servidor del usuario")
    @GetMapping("/{servidorId}")
    @PreAuthorize("hasRole('ADMIN') or @seguridad.esDuenioDelServidor(#servidorId, authentication)")
    public ResponseEntity<ApiResponse<Map<String, Object>>> obtenerEstadoDelServidor(@PathVariable String servidorId) {
        Optional<HealthCheck> ultimoEstado = healthMonitorService.obtenerEstado(servidorId);
        List<HealthCheck> historial = healthMonitorService.obtenerHistorial(servidorId);

        // HashMap permite valores null cuando no hay ultimo estado todavia (a diferencia de Map.of)
        Map<String, Object> datos = new java.util.HashMap<>();
        datos.put("ultimoEstado", ultimoEstado.orElse(null));
        datos.put("historial", historial);

        ApiResponse<Map<String, Object>> cuerpo = new ApiResponse<>(true, "OK", datos);
        return ResponseEntity.ok(cuerpo);
    }
}
