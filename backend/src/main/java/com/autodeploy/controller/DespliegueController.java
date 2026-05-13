package com.autodeploy.controller;

import com.autodeploy.dto.ApiResponse;
import com.autodeploy.dto.NuevoDespliegueRequest;
import com.autodeploy.model.Despliegue;
import com.autodeploy.service.DespliegueService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/despliegues")
public class DespliegueController {

    private final DespliegueService despliegueService;

    public DespliegueController(DespliegueService despliegueService) {
        this.despliegueService = despliegueService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Despliegue>>> obtenerHistorial() {
        List<Despliegue> listaDeDespliegues = despliegueService.obtenerHistorial();

        ApiResponse<List<Despliegue>> cuerpo = new ApiResponse<>(true, "OK", listaDeDespliegues);
        return ResponseEntity.ok(cuerpo);
    }

    @GetMapping("/servidor/{servidorId}")
    public ResponseEntity<ApiResponse<List<Despliegue>>> obtenerPorServidor(@PathVariable String servidorId) {
        List<Despliegue> listaDeDesplieguesDelServidor = despliegueService.obtenerPorServidor(servidorId);

        ApiResponse<List<Despliegue>> cuerpo = new ApiResponse<>(true, "OK", listaDeDesplieguesDelServidor);
        return ResponseEntity.ok(cuerpo);
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Despliegue>> registrar(@RequestBody @Valid NuevoDespliegueRequest peticion) {
        Despliegue despliegue = despliegueService.registrar(peticion.servidorId(), peticion.tipo(), peticion.url());
        URI ubicacion = URI.create("/api/despliegues/" + despliegue.getId());

        ApiResponse<Despliegue> cuerpo = new ApiResponse<>(true, "Despliegue iniciado", despliegue);
        return ResponseEntity.created(ubicacion).body(cuerpo);
    }
}
