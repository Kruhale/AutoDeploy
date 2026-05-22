package com.autodeploy.controller;

import com.autodeploy.config.Seguridad;
import com.autodeploy.dto.ApiResponse;
import com.autodeploy.dto.NuevoDespliegueRequest;
import com.autodeploy.model.Despliegue;
import com.autodeploy.service.DespliegueService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@Tag(name = "Despliegues", description = "Historial de despliegues de aplicaciones")
@RestController
@RequestMapping("/api/despliegues")
@PreAuthorize("isAuthenticated()")
public class DespliegueController {

    private final DespliegueService despliegueService;
    private final Seguridad seguridad;

    public DespliegueController(DespliegueService despliegueService, Seguridad seguridad) {
        this.despliegueService = despliegueService;
        this.seguridad = seguridad;
    }

    @Operation(summary = "Historial de despliegues. ADMIN ve todos; USUARIO ve solo los de sus servidores. Paginacion con ?page=0&size=20")
    @GetMapping
    public ResponseEntity<ApiResponse<?>> obtenerHistorial(Pageable pageable,
                                                            org.springframework.security.core.Authentication autenticacion) {
        boolean esAdmin = seguridad.esAdmin(autenticacion);

        if (pageable != null && pageable.isPaged()) {
            Page<Despliegue> pagina = esAdmin
                    ? despliegueService.obtenerHistorialPaginado(pageable)
                    : despliegueService.obtenerHistorialPaginadoPorUsuario(autenticacion.getName(), pageable);
            return ResponseEntity.ok(new ApiResponse<>(true, "OK", pagina));
        }

        List<Despliegue> lista = esAdmin
                ? despliegueService.obtenerHistorial()
                : despliegueService.obtenerHistorialPorUsuario(autenticacion.getName());
        return ResponseEntity.ok(new ApiResponse<>(true, "OK", lista));
    }

    @Operation(summary = "Historial de despliegues de un servidor del usuario")
    @GetMapping("/servidor/{servidorId}")
    @PreAuthorize("hasRole('ADMIN') or @seguridad.esDuenioDelServidor(#servidorId, authentication)")
    public ResponseEntity<ApiResponse<List<Despliegue>>> obtenerPorServidor(@PathVariable String servidorId) {
        List<Despliegue> listaDeDesplieguesDelServidor = despliegueService.obtenerPorServidor(servidorId);

        ApiResponse<List<Despliegue>> cuerpo = new ApiResponse<>(true, "OK", listaDeDesplieguesDelServidor);
        return ResponseEntity.ok(cuerpo);
    }

    @Operation(summary = "Registrar un nuevo despliegue en un servidor del usuario")
    @PostMapping
    public ResponseEntity<ApiResponse<Despliegue>> registrar(@RequestBody @Valid NuevoDespliegueRequest peticion,
                                                              Authentication autenticacion) {
        if (!seguridad.esAdmin(autenticacion) && !seguridad.esDuenioDelServidor(peticion.servidorId(), autenticacion)) {
            throw new AccessDeniedException("El servidor no pertenece al usuario autenticado");
        }
        Despliegue despliegue = despliegueService.registrar(peticion.servidorId(), peticion.tipo(), peticion.url());
        URI ubicacion = URI.create("/api/despliegues/" + despliegue.getId());

        ApiResponse<Despliegue> cuerpo = new ApiResponse<>(true, "Despliegue iniciado", despliegue);
        return ResponseEntity.created(ubicacion).body(cuerpo);
    }
}
