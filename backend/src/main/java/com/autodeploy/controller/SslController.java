package com.autodeploy.controller;

import com.autodeploy.dto.ApiResponse;
import com.autodeploy.dto.GenerarCertificadoRequest;
import com.autodeploy.model.Servidor;
import com.autodeploy.service.SslService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ssl")
public class SslController {

    private final SslService sslService;

    public SslController(SslService sslService) {
        this.sslService = sslService;
    }

    @PostMapping("/{servidorId}/instalar")
    public ResponseEntity<ApiResponse<String>> instalarCertbot(@PathVariable String servidorId) {
        Servidor servidor = sslService.obtenerServidorOLanzarError(servidorId);
        String salidaInstalacion = sslService.instalarCertbot(servidor);

        ApiResponse<String> cuerpo = new ApiResponse<>(true, "Certbot instalado", salidaInstalacion);
        return ResponseEntity.ok(cuerpo);
    }

    @PostMapping("/{servidorId}/generar")
    public ResponseEntity<ApiResponse<String>> generarCertificado(
            @PathVariable String servidorId,
            @RequestBody GenerarCertificadoRequest peticion) {

        Servidor servidor = sslService.obtenerServidorOLanzarError(servidorId);
        String salidaGeneracion = sslService.generarCertificado(servidor, peticion.dominio(), peticion.email());

        ApiResponse<String> cuerpo = new ApiResponse<>(true, "Certificado generado", salidaGeneracion);
        return ResponseEntity.ok(cuerpo);
    }

    @PostMapping("/{servidorId}/renovar")
    public ResponseEntity<ApiResponse<String>> renovarCertificados(@PathVariable String servidorId) {
        Servidor servidor = sslService.obtenerServidorOLanzarError(servidorId);
        String salidaRenovacion = sslService.renovarCertificados(servidor);

        ApiResponse<String> cuerpo = new ApiResponse<>(true, "Renovacion ejecutada", salidaRenovacion);
        return ResponseEntity.ok(cuerpo);
    }

    @GetMapping("/{servidorId}/estado/{dominio}")
    public ResponseEntity<ApiResponse<String>> estadoCertificado(
            @PathVariable String servidorId,
            @PathVariable String dominio) {

        Servidor servidor = sslService.obtenerServidorOLanzarError(servidorId);
        String salidaEstado = sslService.obtenerEstadoCertificado(servidor, dominio);

        ApiResponse<String> cuerpo = new ApiResponse<>(true, "OK", salidaEstado);
        return ResponseEntity.ok(cuerpo);
    }
}
