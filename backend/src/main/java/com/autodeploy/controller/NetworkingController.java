package com.autodeploy.controller;

import com.autodeploy.config.Seguridad;
import com.autodeploy.dto.ApiResponse;
import com.autodeploy.model.Redireccion;
import com.autodeploy.repository.RedireccionRepository;
import com.autodeploy.service.NetworkingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@Tag(name = "Networking", description = "DNS y redirecciones HTTP del servidor")
@RestController
@RequestMapping("/api/networking")
@PreAuthorize("isAuthenticated()")
public class NetworkingController {

    private final NetworkingService networkingService;
    private final RedireccionRepository redireccionRepository;
    private final Seguridad seguridad;

    public NetworkingController(NetworkingService networkingService,
                                RedireccionRepository redireccionRepository,
                                Seguridad seguridad) {
        this.networkingService = networkingService;
        this.redireccionRepository = redireccionRepository;
        this.seguridad = seguridad;
    }

    public record NuevaRedireccionRequest(String servidorId, String hostOrigen, String urlDestino, Integer codigoEstado) {}

    @Operation(summary = "Consulta DNS publica (cualquier usuario autenticado)")
    @GetMapping("/dns/{dominio}")
    public ResponseEntity<ApiResponse<Map<String, List<String>>>> consultarDns(@PathVariable String dominio) {
        Map<String, List<String>> registros = networkingService.consultarDns(dominio);
        return ResponseEntity.ok(new ApiResponse<>(true, "OK", registros));
    }

    @Operation(summary = "Listar redirecciones HTTP del servidor")
    @GetMapping("/redirects/{servidorId}")
    @PreAuthorize("hasRole('ADMIN') or @seguridad.esDuenioDelServidor(#servidorId, authentication)")
    public ResponseEntity<ApiResponse<List<Redireccion>>> listarRedirecciones(@PathVariable String servidorId) {
        List<Redireccion> redirecciones = networkingService.listarRedirecciones(servidorId);
        return ResponseEntity.ok(new ApiResponse<>(true, "OK", redirecciones));
    }

    @Operation(summary = "Crear redireccion HTTP")
    @PostMapping("/redirects")
    public ResponseEntity<ApiResponse<Redireccion>> crearRedireccion(@RequestBody NuevaRedireccionRequest peticion,
                                                                       Authentication autenticacion) {
        verificarPropietarioDeServidor(peticion.servidorId(), autenticacion);
        int codigo = peticion.codigoEstado() == null ? 301 : peticion.codigoEstado();
        Redireccion nueva = networkingService.crearRedireccion(
                peticion.servidorId(),
                peticion.hostOrigen(),
                peticion.urlDestino(),
                codigo
        );
        return ResponseEntity.ok(new ApiResponse<>(true, "Redireccion creada", nueva));
    }

    @Operation(summary = "Eliminar redireccion por id")
    @DeleteMapping("/redirects/{id}")
    public ResponseEntity<Void> eliminarRedireccion(@PathVariable String id, Authentication autenticacion) {
        Redireccion redireccion = redireccionRepository.findById(id).orElse(null);
        if (redireccion != null) {
            verificarPropietarioDeServidor(redireccion.getServidorId(), autenticacion);
        }
        networkingService.eliminarRedireccion(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Previsualizar fichero de redirects nginx generado")
    @GetMapping("/redirects/{servidorId}/preview")
    @PreAuthorize("hasRole('ADMIN') or @seguridad.esDuenioDelServidor(#servidorId, authentication)")
    public ResponseEntity<ApiResponse<String>> previsualizarConfig(@PathVariable String servidorId) {
        String config = networkingService.leerConfigRedirects(servidorId);
        return ResponseEntity.ok(new ApiResponse<>(true, "OK", config));
    }

    private void verificarPropietarioDeServidor(String servidorId, Authentication autenticacion) {
        if (seguridad.esAdmin(autenticacion) || seguridad.esDuenioDelServidor(servidorId, autenticacion)) {
            return;
        }
        throw new AccessDeniedException("El servidor no pertenece al usuario autenticado");
    }
}
