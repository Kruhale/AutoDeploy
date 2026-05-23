package com.autodeploy.controller;

import com.autodeploy.dto.ApiResponse;
import com.autodeploy.model.Servidor;
import com.autodeploy.service.LogService;
import com.autodeploy.service.ServidorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Logs", description = "Lectura de logs de los servidores del usuario")
@RestController
@RequestMapping("/api/logs")
@PreAuthorize("isAuthenticated()")
public class LogController {

    private final LogService logService;
    private final ServidorService servidorService;

    public LogController(LogService logService, ServidorService servidorService) {
        this.logService = logService;
        this.servidorService = servidorService;
    }

    @Operation(summary = "Ultimas lineas de un log del servidor")
    @GetMapping("/{servidorId}")
    @PreAuthorize("hasRole('ADMIN') or @seguridad.esDuenioDelServidor(#servidorId, authentication)")
    public ResponseEntity<ApiResponse<List<String>>> obtenerLogs(
            @PathVariable String servidorId,
            @RequestParam(defaultValue = "/var/log/syslog") String archivo,
            @RequestParam(defaultValue = "100") int lineas) {

        Servidor servidor = servidorService.obtenerPorId(servidorId);
        List<String> listaDeLineas = logService.obtenerUltimasLineas(servidor, archivo, lineas);

        ApiResponse<List<String>> cuerpo = new ApiResponse<>(true, "OK", listaDeLineas);
        return ResponseEntity.ok(cuerpo);
    }

    @Operation(summary = "Buscar texto en un log del servidor")
    @GetMapping("/{servidorId}/buscar")
    @PreAuthorize("hasRole('ADMIN') or @seguridad.esDuenioDelServidor(#servidorId, authentication)")
    public ResponseEntity<ApiResponse<List<String>>> buscarEnLogs(
            @PathVariable String servidorId,
            @RequestParam(defaultValue = "/var/log/syslog") String archivo,
            @RequestParam String patron) {

        Servidor servidor = servidorService.obtenerPorId(servidorId);
        List<String> listaDeResultados = logService.buscarEnLogs(servidor, archivo, patron);

        ApiResponse<List<String>> cuerpo = new ApiResponse<>(true, "OK", listaDeResultados);
        return ResponseEntity.ok(cuerpo);
    }
}
