package com.autodeploy.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "actividad_log")
public class ActividadLog {

    @Id
    private String id;
    private String tipo;
    private String mensaje;
    private String icono;
    private LocalDateTime fechaCreacion;

    public ActividadLog() {}

    public ActividadLog(String tipo, String mensaje, String icono) {
        this.tipo = tipo;
        this.mensaje = mensaje;
        this.icono = icono;
        this.fechaCreacion = LocalDateTime.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public String getMensaje() { return mensaje; }
    public void setMensaje(String mensaje) { this.mensaje = mensaje; }

    public String getIcono() { return icono; }
    public void setIcono(String icono) { this.icono = icono; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
}
