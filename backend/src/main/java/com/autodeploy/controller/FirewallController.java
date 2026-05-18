package com.autodeploy.controller;

import com.autodeploy.dto.ApiResponse;
import com.autodeploy.model.ReglaFirewall;
import com.autodeploy.service.FirewallService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/firewall")
public class FirewallController {

    private final FirewallService firewallService;

    public FirewallController(FirewallService firewallService) {
        this.firewallService = firewallService;
    }

    public record NuevaReglaRequest(String servidorId, String puerto, String protocolo, String accion, String origen, String descripcion) {}
    public record ServidorRequest(String servidorId) {}

    @GetMapping("/servidor/{servidorId}")
    public ResponseEntity<ApiResponse<List<ReglaFirewall>>> listar(@PathVariable String servidorId) {
        List<ReglaFirewall> reglas = firewallService.listarPorServidor(servidorId);
        return ResponseEntity.ok(new ApiResponse<>(true, "OK", reglas));
    }

    @PostMapping("/regla")
    public ResponseEntity<ApiResponse<ReglaFirewall>> agregarRegla(@RequestBody NuevaReglaRequest peticion) {
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

    @DeleteMapping("/regla/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable String id) {
        firewallService.eliminarRegla(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/activar")
    public ResponseEntity<ApiResponse<String>> activar(@RequestBody ServidorRequest peticion) {
        firewallService.activarFirewall(peticion.servidorId());
        return ResponseEntity.ok(new ApiResponse<>(true, "Firewall activado", null));
    }

    @PostMapping("/desactivar")
    public ResponseEntity<ApiResponse<String>> desactivar(@RequestBody ServidorRequest peticion) {
        firewallService.desactivarFirewall(peticion.servidorId());
        return ResponseEntity.ok(new ApiResponse<>(true, "Firewall desactivado", null));
    }

    @GetMapping("/estado/{servidorId}")
    public ResponseEntity<ApiResponse<String>> estado(@PathVariable String servidorId) {
        String estado = firewallService.estado(servidorId);
        return ResponseEntity.ok(new ApiResponse<>(true, "OK", estado));
    }
}
