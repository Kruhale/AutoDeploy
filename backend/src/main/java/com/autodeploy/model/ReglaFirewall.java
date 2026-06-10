package com.autodeploy.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "regla_firewall")
public class ReglaFirewall {

    @Id
    private String id;
    private String servidorId;
    private String puerto;
    private String protocolo;
    private String accion;
    private String origen;
    private String descripcion;
    private LocalDateTime fechaCreacion;

    public ReglaFirewall() {
        this.fechaCreacion = LocalDateTime.now();
    }

    public ReglaFirewall(String servidorId, String puerto, String protocolo, String accion, String origen, String descripcion) {
        this.servidorId = servidorId;
        this.puerto = puerto;
        this.protocolo = protocolo;
        this.accion = accion;
        this.origen = origen;
        this.descripcion = descripcion;
        this.fechaCreacion = LocalDateTime.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getServidorId() { return servidorId; }
    public void setServidorId(String servidorId) { this.servidorId = servidorId; }

    public String getPuerto() { return puerto; }
    public void setPuerto(String puerto) { this.puerto = puerto; }

    public String getProtocolo() { return protocolo; }
    public void setProtocolo(String protocolo) { this.protocolo = protocolo; }

    public String getAccion() { return accion; }
    public void setAccion(String accion) { this.accion = accion; }

    public String getOrigen() { return origen; }
    public void setOrigen(String origen) { this.origen = origen; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
}
