package com.autodeploy.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "servidor")
public class Servidor {

    @Id
    private String id;
    private String nombre;
    private String direccionIp;
    private int puertoSsh;
    private String usuarioSsh;
    private String metodoAutenticacion;
    private String passwordCifrada;
    private String claveSshPrivada;
    private String estado;
    private LocalDateTime fechaCreacion;

    public Servidor() {
        this.puertoSsh = 22;
        this.usuarioSsh = "root";
        this.metodoAutenticacion = "password";
        this.estado = "pendiente";
        this.fechaCreacion = LocalDateTime.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getDireccionIp() { return direccionIp; }
    public void setDireccionIp(String direccionIp) { this.direccionIp = direccionIp; }

    public int getPuertoSsh() { return puertoSsh; }
    public void setPuertoSsh(int puertoSsh) { this.puertoSsh = puertoSsh; }

    public String getUsuarioSsh() { return usuarioSsh; }
    public void setUsuarioSsh(String usuarioSsh) { this.usuarioSsh = usuarioSsh; }

    public String getMetodoAutenticacion() { return metodoAutenticacion; }
    public void setMetodoAutenticacion(String metodoAutenticacion) { this.metodoAutenticacion = metodoAutenticacion; }

    public String getPasswordCifrada() { return passwordCifrada; }
    public void setPasswordCifrada(String passwordCifrada) { this.passwordCifrada = passwordCifrada; }

    public String getClaveSshPrivada() { return claveSshPrivada; }
    public void setClaveSshPrivada(String claveSshPrivada) { this.claveSshPrivada = claveSshPrivada; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
}
