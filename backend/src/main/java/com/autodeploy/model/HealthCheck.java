package com.autodeploy.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "health_check")
public class HealthCheck {

    @Id
    private String id;
    private String servidorId;
    private String nombreServidor;
    private String estado;
    private long tiempoRespuestaMs;
    private String mensaje;
    private LocalDateTime fechaComprobacion;

    public HealthCheck() {}

    public HealthCheck(String servidorId, String nombreServidor, String estado, long tiempoRespuestaMs, String mensaje) {
        this.servidorId = servidorId;
        this.nombreServidor = nombreServidor;
        this.estado = estado;
        this.tiempoRespuestaMs = tiempoRespuestaMs;
        this.mensaje = mensaje;
        this.fechaComprobacion = LocalDateTime.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getServidorId() { return servidorId; }
    public void setServidorId(String servidorId) { this.servidorId = servidorId; }

    public String getNombreServidor() { return nombreServidor; }
    public void setNombreServidor(String nombreServidor) { this.nombreServidor = nombreServidor; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public long getTiempoRespuestaMs() { return tiempoRespuestaMs; }
    public void setTiempoRespuestaMs(long tiempoRespuestaMs) { this.tiempoRespuestaMs = tiempoRespuestaMs; }

    public String getMensaje() { return mensaje; }
    public void setMensaje(String mensaje) { this.mensaje = mensaje; }

    public LocalDateTime getFechaComprobacion() { return fechaComprobacion; }
    public void setFechaComprobacion(LocalDateTime fechaComprobacion) { this.fechaComprobacion = fechaComprobacion; }
}
