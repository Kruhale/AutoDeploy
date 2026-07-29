package com.autodeploy.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "backup")
public class Backup {

    @Id
    private String id;
    private String servidorId;
    private String nombre;
    private String tipo;
    private String estado;
    private String tamano;
    private String rutaArchivo;
    private LocalDateTime fechaCreacion;

    public Backup() {
        this.fechaCreacion = LocalDateTime.now();
    }

    public Backup(String servidorId, String tipo) {
        this.servidorId = servidorId;
        this.tipo = tipo;
        this.estado = "en_progreso";
        this.fechaCreacion = LocalDateTime.now();
        this.nombre = "backup-" + System.currentTimeMillis();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getServidorId() { return servidorId; }
    public void setServidorId(String servidorId) { this.servidorId = servidorId; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public String getTamano() { return tamano; }
    public void setTamano(String tamano) { this.tamano = tamano; }

    public String getRutaArchivo() { return rutaArchivo; }
    public void setRutaArchivo(String rutaArchivo) { this.rutaArchivo = rutaArchivo; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
}
