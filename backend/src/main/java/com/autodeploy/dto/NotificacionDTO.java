package com.autodeploy.dto;

import java.time.LocalDateTime;

public class NotificacionDTO {

	private String id;
	private String tipo;
	private String titulo;
	private String descripcion;
	private boolean leida;
	private LocalDateTime fechaCreacion;

	public NotificacionDTO() {}

	public NotificacionDTO(String id, String tipo, String titulo, String descripcion, boolean leida, LocalDateTime fechaCreacion) {
		this.id = id;
		this.tipo = tipo;
		this.titulo = titulo;
		this.descripcion = descripcion;
		this.leida = leida;
		this.fechaCreacion = fechaCreacion;
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
}
