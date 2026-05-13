package com.autodeploy.dto;

import jakarta.validation.constraints.NotBlank;

public record NuevoDespliegueRequest(
        @NotBlank(message = "El servidorId no puede estar vacio")
        String servidorId,

        @NotBlank(message = "El tipo no puede estar vacio")
        String tipo,

        String url
) {}
