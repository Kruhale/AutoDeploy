package com.autodeploy.controller;

import com.autodeploy.config.Seguridad;
import com.autodeploy.dto.ApiResponse;
import com.autodeploy.model.Despliegue;
import com.autodeploy.model.Servidor;
import com.autodeploy.service.DespliegueService;
import com.autodeploy.service.ServidorService;
import com.autodeploy.service.ZipDeployService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;

@Tag(name = "Deploy ZIP", description = "Despliegue de aplicaciones desde archivo ZIP")
@RestController
@RequestMapping("/api/deploy")
@PreAuthorize("isAuthenticated()")
public class DeployZipController {

    private final ZipDeployService zipDeployService;
    private final ServidorService servidorService;
    private final DespliegueService despliegueService;
    private final Seguridad seguridad;

    public DeployZipController(ZipDeployService zipDeployService,
                               ServidorService servidorService,
                               DespliegueService despliegueService,
                               Seguridad seguridad) {
        this.zipDeployService = zipDeployService;
        this.servidorService = servidorService;
        this.despliegueService = despliegueService;
        this.seguridad = seguridad;
    }

    @Operation(summary = "Desplegar aplicacion en el servidor desde archivo ZIP")
    @PostMapping(value = "/zip", consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<Despliegue>> desplegarDesdeZip(
            @RequestParam("servidorId") String servidorId,
            @RequestParam("directorio") String directorio,
            @RequestParam("tecnologia") String tecnologia,
            @RequestParam("archivo") MultipartFile archivoZip,
            Authentication autenticacion
    ) {
        verificarPropietarioDeServidor(servidorId, autenticacion);
        Servidor servidor = servidorService.obtenerPorId(servidorId);
        Despliegue despliegueRegistrado = despliegueService.registrar(servidorId, "zip", archivoZip.getOriginalFilename());

        try {
            String salida = zipDeployService.desplegarDesdeZip(servidor, archivoZip, directorio, tecnologia);
            Despliegue despliegueCompletado = despliegueService.completar(despliegueRegistrado.getId(), salida);

            URI ubicacion = URI.create("/api/despliegues/" + despliegueCompletado.getId());
            ApiResponse<Despliegue> cuerpo = new ApiResponse<>(true, "Despliegue ZIP completado", despliegueCompletado);
            return ResponseEntity.created(ubicacion).body(cuerpo);
        } catch (Exception excepcion) {
            Despliegue despliegueConError = despliegueService.fallar(despliegueRegistrado.getId(), excepcion.getMessage());

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
