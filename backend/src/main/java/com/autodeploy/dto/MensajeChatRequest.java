package com.autodeploy.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record MensajeChatRequest(
    @NotBlank(message = "El usuarioId no puede estar vacio")
    String usuarioId,

    @NotBlank(message = "El servidorId no puede estar vacio")
    String servidorId,

    @NotBlank(message = "El mensaje no puede estar vacio")
    String mensaje,

    List<MensajeUsuario> historial
) {}
