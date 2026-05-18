package com.autodeploy.controller;

import com.autodeploy.dto.ApiResponse;
import com.autodeploy.model.Despliegue;
import com.autodeploy.model.Servidor;
import com.autodeploy.service.DespliegueService;
import com.autodeploy.service.ServidorService;
import com.autodeploy.service.ZipDeployService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;

@RestController
@RequestMapping("/api/deploy")
public class DeployZipController {

    private final ZipDeployService zipDeployService;
    private final ServidorService servidorService;
    private final DespliegueService despliegueService;

    public DeployZipController(ZipDeployService zipDeployService, ServidorService servidorService, DespliegueService despliegueService) {
        this.zipDeployService = zipDeployService;
        this.servidorService = servidorService;
        this.despliegueService = despliegueService;
    }

    @PostMapping(value = "/zip", consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<Despliegue>> desplegarDesdeZip(
            @RequestParam("servidorId") String servidorId,
            @RequestParam("directorio") String directorio,
            @RequestParam("tecnologia") String tecnologia,
            @RequestParam("archivo") MultipartFile archivoZip
    ) {
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
}
