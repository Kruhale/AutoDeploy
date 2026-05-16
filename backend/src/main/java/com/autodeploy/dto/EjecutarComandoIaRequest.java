package com.autodeploy.dto;

import jakarta.validation.constraints.NotBlank;

public record EjecutarComandoIaRequest(
    @NotBlank(message = "El servidorId no puede estar vacio")
    String servidorId,

    @NotBlank(message = "El comando no puede estar vacio")
    String comando
) {}
