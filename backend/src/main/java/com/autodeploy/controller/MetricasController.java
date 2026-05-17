package com.autodeploy.controller;

import com.autodeploy.exception.ResourceNotFoundException;
import com.autodeploy.model.MetricaServidor;
import com.autodeploy.model.Servidor;
import com.autodeploy.repository.MetricaServidorRepository;
import com.autodeploy.service.MonitorMetricasService;
import com.autodeploy.service.ServidorService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
@RequestMapping("/api/metricas")
public class MetricasController {

    private final MetricaServidorRepository metricaServidorRepository;
    private final MonitorMetricasService monitorMetricasService;
    private final ServidorService servidorService;

    public MetricasController(
            MetricaServidorRepository metricaServidorRepository,
            MonitorMetricasService monitorMetricasService,
            ServidorService servidorService) {
        this.metricaServidorRepository = metricaServidorRepository;
        this.monitorMetricasService = monitorMetricasService;
        this.servidorService = servidorService;
    }

    @GetMapping("/{servidorId}/ultima")
    public ResponseEntity<MetricaServidor> obtenerUltima(@PathVariable String servidorId) {
        Optional<MetricaServidor> metricaEncontrada = metricaServidorRepository
                .findTopByServidorIdOrderByFechaMedicionDesc(servidorId);
        if (metricaEncontrada.isEmpty()) {
            throw new ResourceNotFoundException("No hay metricas para el servidor " + servidorId);
        }
        return ResponseEntity.ok(metricaEncontrada.get());
    }

    @PostMapping("/{servidorId}/recolectar-ahora")
    public ResponseEntity<MetricaServidor> recolectarAhora(@PathVariable String servidorId) {
        Servidor servidor = servidorService.obtenerPorId(servidorId);
        MetricaServidor metricaRecolectada = monitorMetricasService.recolectarParaServidor(servidor);
        return ResponseEntity.ok(metricaRecolectada);
    }
}
