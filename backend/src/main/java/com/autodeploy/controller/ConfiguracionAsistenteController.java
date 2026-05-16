package com.autodeploy.controller;

import com.autodeploy.dto.ApiResponse;
import com.autodeploy.dto.ConfiguracionAsistenteRequest;
import com.autodeploy.dto.ConfiguracionAsistenteResponse;
import com.autodeploy.service.ConfiguracionAsistenteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Configuracion asistente IA", description = "API key y comandos auto-aprobados del asistente")
@RestController
@RequestMapping("/api/asistente-ia/configuracion")
public class ConfiguracionAsistenteController {

    private final ConfiguracionAsistenteService configuracionService;

    public ConfiguracionAsistenteController(ConfiguracionAsistenteService configuracionService) {
        this.configuracionService = configuracionService;
    }

    @Operation(summary = "Obtener configuracion del usuario")
    @GetMapping("/{usuarioId}")
    public ResponseEntity<ApiResponse<ConfiguracionAsistenteResponse>> obtener(@PathVariable String usuarioId) {
        ConfiguracionAsistenteResponse resumen = configuracionService.obtenerResumen(usuarioId);
        ApiResponse<ConfiguracionAsistenteResponse> cuerpo = new ApiResponse<>(true, "OK", resumen);
        return ResponseEntity.ok(cuerpo);
    }

    @Operation(summary = "Actualizar configuracion del usuario")
    @PutMapping("/{usuarioId}")
    public ResponseEntity<ApiResponse<ConfiguracionAsistenteResponse>> actualizar(@PathVariable String usuarioId, @RequestBody ConfiguracionAsistenteRequest peticion) {
        ConfiguracionAsistenteResponse resumen = configuracionService.actualizar(usuarioId, peticion);
        ApiResponse<ConfiguracionAsistenteResponse> cuerpo = new ApiResponse<>(true, "Configuracion actualizada", resumen);
        return ResponseEntity.ok(cuerpo);
    }
}
