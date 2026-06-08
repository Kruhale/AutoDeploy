package com.autodeploy.controller;

import com.autodeploy.config.Seguridad;
import com.autodeploy.dto.ApiResponse;
import com.autodeploy.model.ReglaFirewall;
import com.autodeploy.repository.ReglaFirewallRepository;
import com.autodeploy.service.FirewallService;
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

@Tag(name = "Firewall", description = "Gestion de reglas UFW del servidor")
@RestController
@RequestMapping("/api/firewall")
@PreAuthorize("isAuthenticated()")
public class FirewallController {

    private final FirewallService firewallService;
    private final ReglaFirewallRepository reglaFirewallRepository;
    private final Seguridad seguridad;

    public FirewallController(FirewallService firewallService,
                              ReglaFirewallRepository reglaFirewallRepository,
                              Seguridad seguridad) {
        this.firewallService = firewallService;
        this.reglaFirewallRepository = reglaFirewallRepository;
        this.seguridad = seguridad;
    }

    public record NuevaReglaRequest(String servidorId, String puerto, String protocolo, String accion, String origen, String descripcion) {}
    public record ServidorRequest(String servidorId) {}

    @Operation(summary = "Listar reglas del firewall del servidor")
    @GetMapping("/servidor/{servidorId}")
    @PreAuthorize("hasRole('ADMIN') or @seguridad.esDuenioDelServidor(#servidorId, authentication)")
    public ResponseEntity<ApiResponse<List<ReglaFirewall>>> listar(@PathVariable String servidorId) {
        List<ReglaFirewall> reglas = firewallService.listarPorServidor(servidorId);
        return ResponseEntity.ok(new ApiResponse<>(true, "OK", reglas));
    }

    @Operation(summary = "Crear nueva regla de firewall")
    @PostMapping("/regla")
    public ResponseEntity<ApiResponse<ReglaFirewall>> agregarRegla(@RequestBody NuevaReglaRequest peticion,
                                                                    Authentication autenticacion) {
        verificarPropietarioDeServidor(peticion.servidorId(), autenticacion);
        ReglaFirewall nuevaRegla = firewallService.agregarRegla(
                peticion.servidorId(),
                peticion.puerto(),
                peticion.protocolo() != null ? peticion.protocolo() : "TCP",
                peticion.accion() != null ? peticion.accion() : "allow",
                peticion.origen() != null ? peticion.origen() : "0.0.0.0/0",
                peticion.descripcion() != null ? peticion.descripcion() : ""
        );
        return ResponseEntity.ok(new ApiResponse<>(true, "Regla creada", nuevaRegla));
    }

    @Operation(summary = "Eliminar una regla por id")
    @DeleteMapping("/regla/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable String id, Authentication autenticacion) {
        ReglaFirewall regla = reglaFirewallRepository.findById(id).orElse(null);
        if (regla != null) {
            verificarPropietarioDeServidor(regla.getServidorId(), autenticacion);
        }
        firewallService.eliminarRegla(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Activar firewall en el servidor")
    @PostMapping("/activar")
    public ResponseEntity<ApiResponse<String>> activar(@RequestBody ServidorRequest peticion,
                                                       Authentication autenticacion) {
        verificarPropietarioDeServidor(peticion.servidorId(), autenticacion);
        firewallService.activarFirewall(peticion.servidorId());
        return ResponseEntity.ok(new ApiResponse<>(true, "Firewall activado", null));
    }

    @Operation(summary = "Desactivar firewall en el servidor")
    @PostMapping("/desactivar")
    public ResponseEntity<ApiResponse<String>> desactivar(@RequestBody ServidorRequest peticion,
                                                          Authentication autenticacion) {
        verificarPropietarioDeServidor(peticion.servidorId(), autenticacion);
        firewallService.desactivarFirewall(peticion.servidorId());
        return ResponseEntity.ok(new ApiResponse<>(true, "Firewall desactivado", null));
    }

    @Operation(summary = "Estado actual del firewall del servidor")
    @GetMapping("/estado/{servidorId}")
    @PreAuthorize("hasRole('ADMIN') or @seguridad.esDuenioDelServidor(#servidorId, authentication)")
    public ResponseEntity<ApiResponse<String>> estado(@PathVariable String servidorId) {
        String estado = firewallService.estado(servidorId);
        return ResponseEntity.ok(new ApiResponse<>(true, "OK", estado));
    }

    private void verificarPropietarioDeServidor(String servidorId, Authentication autenticacion) {
        if (seguridad.esAdmin(autenticacion) || seguridad.esDuenioDelServidor(servidorId, autenticacion)) {
            return;
        }
        throw new AccessDeniedException("El servidor no pertenece al usuario autenticado");
    }
}
