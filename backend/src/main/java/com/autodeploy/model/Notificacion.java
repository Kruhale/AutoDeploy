package com.autodeploy.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "notificacion")
public class Notificacion {

	@Id
	private String id;
	private String tipo;
	private String titulo;
	private String descripcion;
	private boolean leida;
	private LocalDateTime fechaCreacion;
	private String usuarioId;

	public Notificacion() {
		this.fechaCreacion = LocalDateTime.now();
		this.leida = false;
	}

	public Notificacion(String tipo, String titulo, String descripcion, String usuarioId) {
		this.tipo = tipo;
		this.titulo = titulo;
		this.descripcion = descripcion;
		this.usuarioId = usuarioId;
		this.fechaCreacion = LocalDateTime.now();
		this.leida = false;
	}

	public String getId() { return id; }
	public void setId(String id) { this.id = id; }

	public String getTipo() { return tipo; }
	public void setTipo(String tipo) { this.tipo = tipo; }

	public String getTitulo() { return titulo; }
	public void setTitulo(String titulo) { this.titulo = titulo; }

	public String getDescripcion() { return descripcion; }
	public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

	public boolean isLeida() { return leida; }
	public void setLeida(boolean leida) { this.leida = leida; }

	public LocalDateTime getFechaCreacion() { return fechaCreacion; }
	public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }

	public String getUsuarioId() { return usuarioId; }
	public void setUsuarioId(String usuarioId) { this.usuarioId = usuarioId; }
}
