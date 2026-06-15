package com.autodeploy.controller;

import com.autodeploy.config.Seguridad;
import com.autodeploy.dto.ApiResponse;
import com.autodeploy.dto.RegistrarSubdominioRequest;
import com.autodeploy.model.Subdominio;
import com.autodeploy.repository.SubdominioRepository;
import com.autodeploy.service.SubdominioService;
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

import java.net.URI;
import java.util.List;

@Tag(name = "Subdominios", description = "Gestion de subdominios DNS asociados a un servidor")
@RestController
@RequestMapping("/api/subdominios")
@PreAuthorize("isAuthenticated()")
public class SubdominioController {

    private final SubdominioService subdominioService;
    private final SubdominioRepository subdominioRepository;
    private final Seguridad seguridad;

    public SubdominioController(SubdominioService subdominioService,
                                SubdominioRepository subdominioRepository,
                                Seguridad seguridad) {
        this.subdominioService = subdominioService;
        this.subdominioRepository = subdominioRepository;
        this.seguridad = seguridad;
    }

    @Operation(summary = "Registrar un nuevo subdominio")
    @PostMapping
    public ResponseEntity<ApiResponse<Subdominio>> registrar(@RequestBody RegistrarSubdominioRequest peticion,
                                                              Authentication autenticacion) {
        verificarPropietarioDeServidor(peticion.servidorId(), autenticacion);
        Subdominio subdominio = subdominioService.registrar(
                peticion.servidorId(),
                peticion.nombre(),
                peticion.tipo(),
                peticion.destino()
        );

        URI ubicacion = URI.create("/api/subdominios/" + subdominio.getId());
        ApiResponse<Subdominio> cuerpo = new ApiResponse<>(true, "Subdominio registrado", subdominio);
        return ResponseEntity.created(ubicacion).body(cuerpo);
    }

    @Operation(summary = "Listar subdominios de un servidor del usuario")
    @GetMapping("/servidor/{servidorId}")
    @PreAuthorize("hasRole('ADMIN') or @seguridad.esDuenioDelServidor(#servidorId, authentication)")
    public ResponseEntity<ApiResponse<List<Subdominio>>> listarPorServidor(@PathVariable String servidorId) {
        List<Subdominio> listaDeSubdominios = subdominioService.listarPorServidor(servidorId);

        ApiResponse<List<Subdominio>> cuerpo = new ApiResponse<>(true, "OK", listaDeSubdominios);
        return ResponseEntity.ok(cuerpo);
    }

    @Operation(summary = "Eliminar subdominio por id")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable String id, Authentication autenticacion) {
        Subdominio sub = subdominioRepository.findById(id).orElse(null);
        if (sub != null) {
            verificarPropietarioDeServidor(sub.getServidorId(), autenticacion);
        }
        subdominioService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    private void verificarPropietarioDeServidor(String servidorId, Authentication autenticacion) {
        if (seguridad.esAdmin(autenticacion) || seguridad.esDuenioDelServidor(servidorId, autenticacion)) {
            return;
        }
        throw new AccessDeniedException("El servidor no pertenece al usuario autenticado");
    }
}
