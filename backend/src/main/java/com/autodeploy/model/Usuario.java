package com.autodeploy.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.LocalDateTime;

@Document(collection = "usuario")
public class Usuario {

    @Id
    private String id;
    private String nombre;
    @Indexed(unique = true)
    private String email;
    private String passwordHash;
    private LocalDateTime fechaCreacion;
    private String plan;

    public Usuario() {
        this.fechaCreacion = LocalDateTime.now();
        this.plan = "free";
    }

    public Usuario(String nombre, String email, String passwordHash) {
        this.nombre = nombre;
        this.email = email;
        this.passwordHash = passwordHash;
        this.fechaCreacion = LocalDateTime.now();
        this.plan = "free";
    }

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
}
