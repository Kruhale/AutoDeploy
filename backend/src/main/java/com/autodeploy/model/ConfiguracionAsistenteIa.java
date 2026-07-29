package com.autodeploy.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "configuracion_asistente_ia")
public class ConfiguracionAsistenteIa {

    @Id
    private String id;

    @Indexed(unique = true)
    private String usuarioId;

    private String apiKeyCifrada;
    private String modeloPreferido;
    private List<String> comandosAutoAprobados;
    private LocalDateTime fechaActualizacion;

    public ConfiguracionAsistenteIa() {
        this.modeloPreferido = "openai/gpt-4o-mini";
        this.comandosAutoAprobados = new ArrayList<>();
        this.fechaActualizacion = LocalDateTime.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUsuarioId() { return usuarioId; }
    public void setUsuarioId(String usuarioId) { this.usuarioId = usuarioId; }

    public String getApiKeyCifrada() { return apiKeyCifrada; }
    public void setApiKeyCifrada(String apiKeyCifrada) { this.apiKeyCifrada = apiKeyCifrada; }

    public String getModeloPreferido() { return modeloPreferido; }
    public void setModeloPreferido(String modeloPreferido) { this.modeloPreferido = modeloPreferido; }

    public List<String> getComandosAutoAprobados() { return comandosAutoAprobados; }
    public void setComandosAutoAprobados(List<String> comandosAutoAprobados) { this.comandosAutoAprobados = comandosAutoAprobados; }

    public LocalDateTime getFechaActualizacion() { return fechaActualizacion; }
    public void setFechaActualizacion(LocalDateTime fechaActualizacion) { this.fechaActualizacion = fechaActualizacion; }
}
