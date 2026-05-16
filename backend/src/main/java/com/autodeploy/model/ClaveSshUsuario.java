package com.autodeploy.model;

import java.time.LocalDateTime;

public class ClaveSshUsuario {

    private String id;
    private String nombre;
    private String huella;
    private String claveCompleta;
    private LocalDateTime fechaCreacion;

    public ClaveSshUsuario() {}

    public ClaveSshUsuario(String id, String nombre, String huella, String claveCompleta) {
        this.id = id;
        this.nombre = nombre;
        this.huella = huella;
        this.claveCompleta = claveCompleta;
        this.fechaCreacion = LocalDateTime.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getHuella() { return huella; }
    public void setHuella(String huella) { this.huella = huella; }

    public String getClaveCompleta() { return claveCompleta; }
    public void setClaveCompleta(String claveCompleta) { this.claveCompleta = claveCompleta; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
}
