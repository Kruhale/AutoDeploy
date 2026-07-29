package com.autodeploy.controller;

import com.autodeploy.config.Seguridad;
import com.autodeploy.dto.ApiResponse;
import com.autodeploy.model.Backup;
import com.autodeploy.model.Servidor;
import com.autodeploy.repository.BackupRepository;
import com.autodeploy.service.BackupService;
import com.autodeploy.service.ServidorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@Tag(name = "Backups", description = "Copias de seguridad de los servidores del usuario")
@RestController
@RequestMapping("/api/backups")
@PreAuthorize("isAuthenticated()")
public class BackupController {

    private final BackupService backupService;
    private final ServidorService servidorService;
    private final BackupRepository backupRepository;
    private final Seguridad seguridad;

    public BackupController(BackupService backupService,
                            ServidorService servidorService,
                            BackupRepository backupRepository,
                            Seguridad seguridad) {
        this.backupService = backupService;
        this.servidorService = servidorService;
        this.backupRepository = backupRepository;
        this.seguridad = seguridad;
    }

    public record NuevoBackupRequest(String servidorId, String tipo) {}

    @Operation(summary = "Listar backups de un servidor")
    @GetMapping("/servidor/{servidorId}")
    @PreAuthorize("hasRole('ADMIN') or @seguridad.esDuenioDelServidor(#servidorId, authentication)")
    public ResponseEntity<ApiResponse<List<Backup>>> listar(@PathVariable String servidorId) {
        List<Backup> backups = backupService.listarPorServidor(servidorId);
        return ResponseEntity.ok(new ApiResponse<>(true, "OK", backups));
    }

    @Operation(summary = "Listar backups paginados de un servidor (?page=0&size=20)")
    @GetMapping("/servidor/{servidorId}/paginados")
    @PreAuthorize("hasRole('ADMIN') or @seguridad.esDuenioDelServidor(#servidorId, authentication)")
    public ResponseEntity<ApiResponse<Page<Backup>>> listarPaginados(@PathVariable String servidorId, Pageable pageable) {
        Page<Backup> pagina = backupRepository.findByServidorIdOrderByFechaCreacionDesc(servidorId, pageable);
        return ResponseEntity.ok(new ApiResponse<>(true, "OK", pagina));
    }

    @Operation(summary = "Crear backup manual de un servidor del usuario")
    @PostMapping
    public ResponseEntity<ApiResponse<Backup>> crear(@RequestBody NuevoBackupRequest peticion,
                                                      Authentication autenticacion) {
        verificarPropietarioDeServidor(peticion.servidorId(), autenticacion);
        Backup nuevoBackup = backupService.crearBackup(
                peticion.servidorId(),
                peticion.tipo() != null ? peticion.tipo() : "manual"
        );
        return ResponseEntity.ok(new ApiResponse<>(true, "Backup en curso", nuevoBackup));
    }

    @Operation(summary = "Eliminar un backup propio")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable String id, Authentication autenticacion) {
        verificarPropietarioDeBackup(id, autenticacion);
        backupService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Restaurar un backup propio")
    @PostMapping("/{id}/restaurar")
    public ResponseEntity<ApiResponse<String>> restaurar(@PathVariable String id, Authentication autenticacion) {
        verificarPropietarioDeBackup(id, autenticacion);
        backupService.restaurar(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Restauracion iniciada", null));
    }

    @Operation(summary = "Consultar configuracion de backups automaticos")
    @GetMapping("/auto/{servidorId}")
    @PreAuthorize("hasRole('ADMIN') or @seguridad.esDuenioDelServidor(#servidorId, authentication)")
    public ResponseEntity<ApiResponse<Map<String, Object>>> consultarAuto(@PathVariable String servidorId) {
        Servidor servidor = servidorService.obtenerPorId(servidorId);
        Map<String, Object> datos = Map.of(
                "activado", servidor.isBackupsAutomaticosActivos(),
                "hora", servidor.getHoraBackupAutomatico() == null ? "03:00" : servidor.getHoraBackupAutomatico()
        );
        return ResponseEntity.ok(new ApiResponse<>(true, "OK", datos));
    }

    @Operation(summary = "Activar/desactivar backups automaticos")
    @PutMapping("/auto/{servidorId}")
    @PreAuthorize("hasRole('ADMIN') or @seguridad.esDuenioDelServidor(#servidorId, authentication)")
    public ResponseEntity<ApiResponse<Servidor>> configurarAuto(
            @PathVariable String servidorId,
            @RequestBody Map<String, Object> peticion) {
        boolean activado = Boolean.TRUE.equals(peticion.get("activado"));
        String hora = peticion.get("hora") == null ? "03:00" : peticion.get("hora").toString();

        Servidor actualizado;
        if (activado) {
            actualizado = backupService.activarBackupsAutomaticos(servidorId, hora);
        } else {
            actualizado = backupService.desactivarBackupsAutomaticos(servidorId);
        }

        return ResponseEntity.ok(new ApiResponse<>(true, activado ? "Cron instalado" : "Cron eliminado", actualizado));
    }

    private void verificarPropietarioDeServidor(String servidorId, Authentication autenticacion) {
        if (seguridad.esAdmin(autenticacion) || seguridad.esDuenioDelServidor(servidorId, autenticacion)) {
            return;
        }
        throw new AccessDeniedException("El servidor no pertenece al usuario autenticado");
    }

    private void verificarPropietarioDeBackup(String backupId, Authentication autenticacion) {
        Backup backup = backupRepository.findById(backupId).orElse(null);
        if (backup == null) {
            // dejar pasar para que el servicio devuelva 404 con mensaje claro
            return;
        }
        verificarPropietarioDeServidor(backup.getServidorId(), autenticacion);
    }
}
