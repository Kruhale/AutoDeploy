package com.autodeploy.controller;

import com.autodeploy.dto.ApiResponse;
import com.autodeploy.model.Backup;
import com.autodeploy.model.Servidor;
import com.autodeploy.service.BackupService;
import com.autodeploy.service.ServidorService;
import org.springframework.http.ResponseEntity;
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

@RestController
@RequestMapping("/api/backups")
public class BackupController {

    private final BackupService backupService;
    private final ServidorService servidorService;

    public BackupController(BackupService backupService, ServidorService servidorService) {
        this.backupService = backupService;
        this.servidorService = servidorService;
    }

    public record NuevoBackupRequest(String servidorId, String tipo) {}

    @GetMapping("/servidor/{servidorId}")
    public ResponseEntity<ApiResponse<List<Backup>>> listar(@PathVariable String servidorId) {
        List<Backup> backups = backupService.listarPorServidor(servidorId);
        return ResponseEntity.ok(new ApiResponse<>(true, "OK", backups));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Backup>> crear(@RequestBody NuevoBackupRequest peticion) {
        Backup nuevoBackup = backupService.crearBackup(
                peticion.servidorId(),
                peticion.tipo() != null ? peticion.tipo() : "manual"
        );
        return ResponseEntity.ok(new ApiResponse<>(true, "Backup en curso", nuevoBackup));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable String id) {
        backupService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/restaurar")
    public ResponseEntity<ApiResponse<String>> restaurar(@PathVariable String id) {
        backupService.restaurar(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Restauracion iniciada", null));
    }

    @GetMapping("/auto/{servidorId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> consultarAuto(@PathVariable String servidorId) {
        Servidor servidor = servidorService.obtenerPorId(servidorId);
        Map<String, Object> datos = Map.of(
                "activado", servidor.isBackupsAutomaticosActivos(),
                "hora", servidor.getHoraBackupAutomatico() == null ? "03:00" : servidor.getHoraBackupAutomatico()
        );
        return ResponseEntity.ok(new ApiResponse<>(true, "OK", datos));
    }

    @PutMapping("/auto/{servidorId}")
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
}
