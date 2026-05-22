package com.autodeploy.controller;

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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Actividad", description = "Log de actividad reciente del sistema (solo ADMIN)")
@RestController
@RequestMapping("/api/actividad")
public class ActividadLogController {

    private final ActividadLogService actividadLogService;
    private final ActividadLogRepository actividadLogRepository;

    public ActividadLogController(ActividadLogService actividadLogService, ActividadLogRepository actividadLogRepository) {
        this.actividadLogService = actividadLogService;
        this.actividadLogRepository = actividadLogRepository;
    }

    @Operation(summary = "Actividad reciente global. Solo accesible para ADMIN porque agrupa acciones de todos los usuarios.")
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<ActividadLog>>> obtenerRecientes() {
        List<ActividadLog> listaDeActividadesRecientes = actividadLogService.obtenerRecientes();

        ApiResponse<List<ActividadLog>> cuerpo = new ApiResponse<>(true, "OK", listaDeActividadesRecientes);
        return ResponseEntity.ok(cuerpo);
    }

    @Operation(summary = "Actividad reciente paginada (?page=0&size=20)")
    @GetMapping("/paginadas")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<ActividadLog>>> obtenerRecientesPaginadas(Pageable pageable) {
        Page<ActividadLog> pagina = actividadLogRepository.findAllByOrderByFechaCreacionDesc(pageable);
        return ResponseEntity.ok(new ApiResponse<>(true, "OK", pagina));
    }
}
