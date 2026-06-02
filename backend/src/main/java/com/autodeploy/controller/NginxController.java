package com.autodeploy.controller;

import com.autodeploy.dto.ApiResponse;
import com.autodeploy.dto.ConfigurarNginxRequest;
import com.autodeploy.model.Servidor;
import com.autodeploy.service.NginxService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Nginx", description = "Instalacion y configuracion de nginx en el servidor")
@RestController
@RequestMapping("/api/nginx")
@PreAuthorize("isAuthenticated() and (hasRole('ADMIN') or @seguridad.esDuenioDelServidor(#servidorId, authentication))")
public class NginxController {

    private final NginxService nginxService;

    public NginxController(NginxService nginxService) {
        this.nginxService = nginxService;
    }

    @Operation(summary = "Instalar nginx en el servidor")
    @PostMapping("/{servidorId}/instalar")
    public ResponseEntity<ApiResponse<String>> instalar(@PathVariable String servidorId) {
        Servidor servidor = nginxService.obtenerServidorOLanzarError(servidorId);
        String salidaInstalacion = nginxService.instalarNginx(servidor);

        ApiResponse<String> cuerpo = new ApiResponse<>(true, "Nginx instalado", salidaInstalacion);
        return ResponseEntity.ok(cuerpo);
    }

    @Operation(summary = "Configurar virtual host en nginx")
    @PostMapping("/{servidorId}/configurar")
    public ResponseEntity<ApiResponse<String>> configurar(
            @PathVariable String servidorId,
            @RequestBody ConfigurarNginxRequest peticion) {

        Servidor servidor = nginxService.obtenerServidorOLanzarError(servidorId);
        String configGenerada = nginxService.generarConfig(peticion.dominio(), peticion.puertoProxy());
        String salidaSubida = nginxService.subirConfig(servidor, peticion.dominio(), configGenerada);

        ApiResponse<String> cuerpo = new ApiResponse<>(true, "Configuracion aplicada", salidaSubida);
        return ResponseEntity.ok(cuerpo);
    }

    @Operation(summary = "Listar virtual hosts configurados en nginx")
    @GetMapping("/{servidorId}/hosts")
    public ResponseEntity<ApiResponse<List<String>>> listarHosts(@PathVariable String servidorId) {
        Servidor servidor = nginxService.obtenerServidorOLanzarError(servidorId);
        List<String> listaDeHosts = nginxService.listarVirtualHosts(servidor);

        ApiResponse<List<String>> cuerpo = new ApiResponse<>(true, "OK", listaDeHosts);
        return ResponseEntity.ok(cuerpo);
    }

    @Operation(summary = "Eliminar virtual host de nginx")
    @DeleteMapping("/{servidorId}/hosts/{dominio}")
    public ResponseEntity<ApiResponse<String>> eliminarHost(
            @PathVariable String servidorId,
            @PathVariable String dominio) {

        Servidor servidor = nginxService.obtenerServidorOLanzarError(servidorId);
        String salidaEliminacion = nginxService.eliminarVirtualHost(servidor, dominio);

        ApiResponse<String> cuerpo = new ApiResponse<>(true, "Virtual host eliminado", salidaEliminacion);
        return ResponseEntity.ok(cuerpo);
    }
}
