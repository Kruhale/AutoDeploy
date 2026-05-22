package com.autodeploy.controller;

import com.autodeploy.config.Seguridad;
import com.autodeploy.dto.ApiResponse;
import com.autodeploy.dto.GitDeployRequest;
import com.autodeploy.model.Despliegue;
import com.autodeploy.model.Servidor;
import com.autodeploy.service.DespliegueService;
import com.autodeploy.service.GitDeployService;
import com.autodeploy.service.ServidorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

@Tag(name = "Deploy Git", description = "Despliegue de aplicaciones desde repositorio Git")
@RestController
@RequestMapping("/api/deploy")
@PreAuthorize("isAuthenticated()")
public class DeployGitController {

    private final GitDeployService gitDeployService;
    private final ServidorService servidorService;
    private final DespliegueService despliegueService;
    private final Seguridad seguridad;

    public DeployGitController(GitDeployService gitDeployService,
                               ServidorService servidorService,
                               DespliegueService despliegueService,
                               Seguridad seguridad) {
        this.gitDeployService = gitDeployService;
        this.servidorService = servidorService;
        this.despliegueService = despliegueService;
        this.seguridad = seguridad;
    }

    @Operation(summary = "Desplegar aplicacion en el servidor desde un repositorio Git")
    @PostMapping("/git")
    public ResponseEntity<ApiResponse<Despliegue>> desplegarDesdeGit(@RequestBody @Valid GitDeployRequest peticion,
                                                                       Authentication autenticacion) {
        verificarPropietarioDeServidor(peticion.servidorId(), autenticacion);
        Servidor servidor = servidorService.obtenerPorId(peticion.servidorId());
        Despliegue despliegue = despliegueService.registrar(peticion.servidorId(), "git", peticion.repoUrl());

        String tokenWebhook = despliegueService.generarTokenWebhook();
        despliegueService.actualizarMetadatosGit(
                despliegue.getId(),
                peticion.tecnologia(),
                peticion.rama(),
                peticion.directorio(),
                tokenWebhook
        );

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

    private void verificarPropietarioDeServidor(String servidorId, Authentication autenticacion) {
        if (seguridad.esAdmin(autenticacion) || seguridad.esDuenioDelServidor(servidorId, autenticacion)) {
            return;
        }
        throw new AccessDeniedException("El servidor no pertenece al usuario autenticado");
    }
}
