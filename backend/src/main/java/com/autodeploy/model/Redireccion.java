package com.autodeploy.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "redireccion")
public class Redireccion {

    @Id
    private String id;
    private String servidorId;
    private String hostOrigen;
    private String urlDestino;
    private int codigoEstado;
    private LocalDateTime fechaCreacion;

    public Redireccion() {
        this.codigoEstado = 301;
        this.fechaCreacion = LocalDateTime.now();
    }

    public Redireccion(String servidorId, String hostOrigen, String urlDestino, int codigoEstado) {
        this.servidorId = servidorId;
        this.hostOrigen = hostOrigen;
        this.urlDestino = urlDestino;
        this.codigoEstado = codigoEstado;
        this.fechaCreacion = LocalDateTime.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getServidorId() { return servidorId; }
    public void setServidorId(String servidorId) { this.servidorId = servidorId; }

    public String getHostOrigen() { return hostOrigen; }
    public void setHostOrigen(String hostOrigen) { this.hostOrigen = hostOrigen; }

    public String getUrlDestino() { return urlDestino; }
    public void setUrlDestino(String urlDestino) { this.urlDestino = urlDestino; }

    public int getCodigoEstado() { return codigoEstado; }
    public void setCodigoEstado(int codigoEstado) { this.codigoEstado = codigoEstado; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
}
