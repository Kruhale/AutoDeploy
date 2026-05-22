package com.autodeploy.controller;

import com.autodeploy.config.Seguridad;
import com.autodeploy.dto.ApiResponse;
import com.autodeploy.model.ActividadLog;
import com.autodeploy.repository.ActividadLogRepository;
import com.autodeploy.service.ActividadLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;

@Tag(name = "Actividad", description = "Log de actividad reciente del sistema")
@RestController
@RequestMapping("/api/actividad")
@PreAuthorize("isAuthenticated()")
public class ActividadLogController {

    private final ActividadLogService actividadLogService;
    private final ActividadLogRepository actividadLogRepository;
    private final Seguridad seguridad;

    public ActividadLogController(ActividadLogService actividadLogService,
                                  ActividadLogRepository actividadLogRepository,
                                  Seguridad seguridad) {
        this.actividadLogService = actividadLogService;
        this.actividadLogRepository = actividadLogRepository;
        this.seguridad = seguridad;
    }

    @Operation(summary = "Actividad reciente. ADMIN ve la actividad global; USUARIO recibe lista vacia (el log es de sistema, no por usuario).")
    @GetMapping
    public ResponseEntity<ApiResponse<List<ActividadLog>>> obtenerRecientes(Authentication autenticacion) {
        List<ActividadLog> lista = seguridad.esAdmin(autenticacion)
                ? actividadLogService.obtenerRecientes()
                : Collections.emptyList();

        ApiResponse<List<ActividadLog>> cuerpo = new ApiResponse<>(true, "OK", lista);
        return ResponseEntity.ok(cuerpo);
    }

    @Operation(summary = "Actividad reciente paginada (solo ADMIN)")
    @GetMapping("/paginadas")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<ActividadLog>>> obtenerRecientesPaginadas(Pageable pageable) {
        Page<ActividadLog> pagina = actividadLogRepository.findAllByOrderByFechaCreacionDesc(pageable);
        return ResponseEntity.ok(new ApiResponse<>(true, "OK", pagina));
    }
}
