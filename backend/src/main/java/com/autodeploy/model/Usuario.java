package com.autodeploy.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "usuario")
public class Usuario {

    public static final String ROL_USUARIO = "USUARIO";
    public static final String ROL_ADMIN = "ADMIN";

    @Id
    private String id;
    private String nombre;
    @Indexed(unique = true)
    private String email;
    @JsonIgnore
    private String passwordHash;
    private LocalDateTime fechaCreacion;
    private String plan;
    private String rol;
    private String idioma;
    private LocalDateTime fechaInicioSuscripcion;
    private LocalDateTime fechaFinSuscripcion;
    private List<ClaveSshUsuario> clavesSsh = new ArrayList<>();
    private PreferenciasNotificacion preferenciasNotificacion = new PreferenciasNotificacion();

    public Usuario() {
        this.fechaCreacion = LocalDateTime.now();
        this.plan = "free";
        this.rol = ROL_USUARIO;
        this.idioma = "es";
        this.clavesSsh = new ArrayList<>();
        this.preferenciasNotificacion = new PreferenciasNotificacion();
    }

    public Usuario(String nombre, String email, String passwordHash) {
        this.nombre = nombre;
        this.email = email;
        this.passwordHash = passwordHash;
        this.fechaCreacion = LocalDateTime.now();
        this.plan = "free";
        this.rol = ROL_USUARIO;
        this.idioma = "es";
        this.clavesSsh = new ArrayList<>();
        this.preferenciasNotificacion = new PreferenciasNotificacion();
    }

    public List<ClaveSshUsuario> getClavesSsh() {
        if (clavesSsh == null) clavesSsh = new ArrayList<>();
        return clavesSsh;
    }
    public void setClavesSsh(List<ClaveSshUsuario> clavesSsh) { this.clavesSsh = clavesSsh; }

    public PreferenciasNotificacion getPreferenciasNotificacion() {
        if (preferenciasNotificacion == null) preferenciasNotificacion = new PreferenciasNotificacion();
        return preferenciasNotificacion;
    }
    public void setPreferenciasNotificacion(PreferenciasNotificacion preferenciasNotificacion) { this.preferenciasNotificacion = preferenciasNotificacion; }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }

    public String getPlan() { return plan; }
    public void setPlan(String plan) { this.plan = plan; }

    public String getRol() { return rol != null ? rol : ROL_USUARIO; }
    public void setRol(String rol) { this.rol = rol; }

    public LocalDateTime getFechaInicioSuscripcion() { return fechaInicioSuscripcion; }
    public void setFechaInicioSuscripcion(LocalDateTime fechaInicioSuscripcion) { this.fechaInicioSuscripcion = fechaInicioSuscripcion; }

    public LocalDateTime getFechaFinSuscripcion() { return fechaFinSuscripcion; }
    public void setFechaFinSuscripcion(LocalDateTime fechaFinSuscripcion) { this.fechaFinSuscripcion = fechaFinSuscripcion; }

    public String getIdioma() { return idioma != null ? idioma : "es"; }
    public void setIdioma(String idioma) { this.idioma = idioma; }
}
