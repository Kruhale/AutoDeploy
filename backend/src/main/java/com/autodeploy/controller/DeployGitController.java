package com.autodeploy.controller;

import com.autodeploy.dto.ApiResponse;
import com.autodeploy.dto.GitDeployRequest;
import com.autodeploy.model.Despliegue;
import com.autodeploy.model.Servidor;
import com.autodeploy.service.DespliegueService;
import com.autodeploy.service.GitDeployService;
import com.autodeploy.service.ServidorService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

@RestController
@RequestMapping("/api/deploy")
public class DeployGitController {

    private final GitDeployService gitDeployService;
    private final ServidorService servidorService;
    private final DespliegueService despliegueService;

    public DeployGitController(GitDeployService gitDeployService, ServidorService servidorService, DespliegueService despliegueService) {
        this.gitDeployService = gitDeployService;
        this.servidorService = servidorService;
        this.despliegueService = despliegueService;
    }

    @PostMapping("/git")
    public ResponseEntity<ApiResponse<Despliegue>> desplegarDesdeGit(@RequestBody @Valid GitDeployRequest peticion) {
        Servidor servidor = servidorService.obtenerPorId(peticion.servidorId());
        Despliegue despliegue = despliegueService.registrar(peticion.servidorId(), "git", peticion.repoUrl());

        try {
            String salidaDelComando = gitDeployService.desplegarConGit(servidor, peticion.repoUrl(), peticion.directorio());
            Despliegue despliegueCompletado = despliegueService.completar(despliegue.getId(), salidaDelComando);

            URI ubicacion = URI.create("/api/despliegues/" + despliegueCompletado.getId());
            ApiResponse<Despliegue> cuerpo = new ApiResponse<>(true, "Despliegue completado", despliegueCompletado);
            return ResponseEntity.created(ubicacion).body(cuerpo);
        } catch (Exception excepcion) {
            Despliegue despliegueConError = despliegueService.fallar(despliegue.getId(), excepcion.getMessage());

            ApiResponse<Despliegue> cuerpo = new ApiResponse<>(false, "Despliegue fallido: " + excepcion.getMessage(), despliegueConError);
            return ResponseEntity.internalServerError().body(cuerpo);
        }
    }
}
