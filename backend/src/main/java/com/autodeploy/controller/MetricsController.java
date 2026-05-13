package com.autodeploy.controller;

import com.autodeploy.dto.ApiResponse;
import com.autodeploy.model.Servidor;
import com.autodeploy.service.MetricsService;
import com.autodeploy.service.ServidorService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/metricas")
public class MetricsController {

    private final MetricsService metricsService;
    private final ServidorService servidorService;

    public MetricsController(MetricsService metricsService, ServidorService servidorService) {
        this.metricsService = metricsService;
        this.servidorService = servidorService;
    }

    @GetMapping("/{servidorId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> obtenerMetricas(@PathVariable String servidorId) {
        Servidor servidor = servidorService.obtenerPorId(servidorId);
        Map<String, Object> mapaDeMetricas = metricsService.obtenerMetricas(servidor);

        ApiResponse<Map<String, Object>> cuerpo = new ApiResponse<>(true, "OK", mapaDeMetricas);
        return ResponseEntity.ok(cuerpo);
    }
}
