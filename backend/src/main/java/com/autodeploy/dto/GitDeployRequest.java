package com.autodeploy.dto;

import jakarta.validation.constraints.NotBlank;

public record GitDeployRequest(
        @NotBlank(message = "El id del servidor no puede estar vacio")
        String servidorId,

        @NotBlank(message = "La URL del repositorio no puede estar vacia")
        String repoUrl,

        @NotBlank(message = "El directorio no puede estar vacio")
        String directorio
) {}
