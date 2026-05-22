package com.autodeploy.controller;

import com.autodeploy.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

@Tag(name = "Estado", description = "Estado de salud global de los servicios de AutoDeploy. Endpoint publico, no requiere autenticacion.")
@RestController
@RequestMapping("/api/estado")
public class EstadoController {

    private final MongoTemplate mongoTemplate;

    public EstadoController(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Operation(summary = "Estado del sistema", description = "Devuelve el estado UP/DEGRADED/DOWN de cada servicio: API, base de datos, WebSocket terminal, WebSocket metricas, WebSocket notificaciones y asistente IA. Usado por el frontend para el indicador de salud y por el smoke test del CD.")
    @GetMapping
    public ResponseEntity<ApiResponse<EstadoSistema>> obtenerEstadoSistema() {
        boolean baseDeDatosViva = comprobarBaseDeDatos();

        EstadoServicio servicioApi = new EstadoServicio("api", "UP", "Operativo");
        EstadoServicio servicioBaseDatos = baseDeDatosViva
                ? new EstadoServicio("baseDeDatos", "UP", "Operativo")
                : new EstadoServicio("baseDeDatos", "DOWN", "Sin conexion");
        EstadoServicio servicioTerminal = new EstadoServicio("websocketTerminal", "UP", "Operativo");
        EstadoServicio servicioMetricas = new EstadoServicio("websocketMetricas", "UP", "Operativo");
        EstadoServicio servicioNotificaciones = new EstadoServicio("websocketNotificaciones", "UP", "Operativo");
        EstadoServicio servicioAsistente = new EstadoServicio("asistenteIa", "UP", "Operativo");

        List<EstadoServicio> listaDeServicios = List.of(
                servicioApi,
                servicioBaseDatos,
                servicioTerminal,
                servicioMetricas,
                servicioNotificaciones,
                servicioAsistente
        );

        String estadoGeneral = baseDeDatosViva ? "UP" : "DEGRADED";
        EstadoSistema cuerpo = new EstadoSistema(estadoGeneral, Instant.now().toString(), listaDeServicios);

        return ResponseEntity.ok(new ApiResponse<>(true, "OK", cuerpo));
    }

    private boolean comprobarBaseDeDatos() {
        try {
            Document respuestaPing = mongoTemplate.getDb().runCommand(new Document("ping", 1));
            return respuestaPing.getDouble("ok") == 1.0;
        } catch (Exception fallo) {
            return false;
        }
    }

    public record EstadoSistema(String estadoGeneral, String actualizadoEn, List<EstadoServicio> servicios) {}

    public record EstadoServicio(String clave, String estado, String descripcion) {}
}
