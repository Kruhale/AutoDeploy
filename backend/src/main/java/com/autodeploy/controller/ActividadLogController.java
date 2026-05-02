package com.autodeploy.controller;

import com.autodeploy.dto.ApiResponse;
import com.autodeploy.model.ActividadLog;
import com.autodeploy.service.ActividadLogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/actividad")
public class ActividadLogController {

    private final ActividadLogService actividadLogService;

    public ActividadLogController(ActividadLogService actividadLogService) {
        this.actividadLogService = actividadLogService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ActividadLog>>> obtenerRecientes() {
        List<ActividadLog> listaDeActividadesRecientes = actividadLogService.obtenerRecientes();

        ApiResponse<List<ActividadLog>> cuerpo = new ApiResponse<>(true, "OK", listaDeActividadesRecientes);
        return ResponseEntity.ok(cuerpo);
    }
}
