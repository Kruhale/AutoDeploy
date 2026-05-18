package com.autodeploy.controller;

import com.autodeploy.dto.ApiResponse;
import com.autodeploy.model.Redireccion;
import com.autodeploy.service.NetworkingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/networking")
public class NetworkingController {

    private final NetworkingService networkingService;

    public NetworkingController(NetworkingService networkingService) {
        this.networkingService = networkingService;
    }

    public record NuevaRedireccionRequest(String servidorId, String hostOrigen, String urlDestino, Integer codigoEstado) {}

    @GetMapping("/dns/{dominio}")
    public ResponseEntity<ApiResponse<Map<String, List<String>>>> consultarDns(@PathVariable String dominio) {
        Map<String, List<String>> registros = networkingService.consultarDns(dominio);
        return ResponseEntity.ok(new ApiResponse<>(true, "OK", registros));
    }

    @GetMapping("/redirects/{servidorId}")
    public ResponseEntity<ApiResponse<List<Redireccion>>> listarRedirecciones(@PathVariable String servidorId) {
        List<Redireccion> redirecciones = networkingService.listarRedirecciones(servidorId);
        return ResponseEntity.ok(new ApiResponse<>(true, "OK", redirecciones));
    }

    @PostMapping("/redirects")
    public ResponseEntity<ApiResponse<Redireccion>> crearRedireccion(@RequestBody NuevaRedireccionRequest peticion) {
        int codigo = peticion.codigoEstado() == null ? 301 : peticion.codigoEstado();
        Redireccion nueva = networkingService.crearRedireccion(
                peticion.servidorId(),
                peticion.hostOrigen(),
                peticion.urlDestino(),
                codigo
        );
        return ResponseEntity.ok(new ApiResponse<>(true, "Redireccion creada", nueva));
    }

    @DeleteMapping("/redirects/{id}")
    public ResponseEntity<Void> eliminarRedireccion(@PathVariable String id) {
        networkingService.eliminarRedireccion(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/redirects/{servidorId}/preview")
    public ResponseEntity<ApiResponse<String>> previsualizarConfig(@PathVariable String servidorId) {
        String config = networkingService.leerConfigRedirects(servidorId);
        return ResponseEntity.ok(new ApiResponse<>(true, "OK", config));
    }
}
