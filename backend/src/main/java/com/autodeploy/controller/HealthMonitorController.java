package com.autodeploy.controller;

import com.autodeploy.dto.ApiResponse;
import com.autodeploy.model.HealthCheck;
import com.autodeploy.service.HealthMonitorService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/health")
public class HealthMonitorController {

    private final HealthMonitorService healthMonitorService;

    public HealthMonitorController(HealthMonitorService healthMonitorService) {
        this.healthMonitorService = healthMonitorService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<HealthCheck>>> obtenerEstadoGeneral() {
        List<HealthCheck> listaDeEstados = healthMonitorService.obtenerEstadoTodosLosServidores();

        ApiResponse<List<HealthCheck>> cuerpo = new ApiResponse<>(true, "OK", listaDeEstados);
        return ResponseEntity.ok(cuerpo);
    }

    @GetMapping("/{servidorId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> obtenerEstadoDelServidor(@PathVariable String servidorId) {
        Optional<HealthCheck> ultimoEstado = healthMonitorService.obtenerEstado(servidorId);
        List<HealthCheck> historial = healthMonitorService.obtenerHistorial(servidorId);

        Map<String, Object> datos = Map.of(
                "ultimoEstado", ultimoEstado.orElse(null),
                "historial", historial
        );

        ApiResponse<Map<String, Object>> cuerpo = new ApiResponse<>(true, "OK", datos);
        return ResponseEntity.ok(cuerpo);
    }
}
