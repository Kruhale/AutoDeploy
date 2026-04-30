package com.autodeploy.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record ConexionSshRequest(
    @NotBlank(message = "El nombre del servidor no puede estar vacio")
    String nombre,

    @NotBlank(message = "La direccion IP no puede estar vacia")
    String direccionIp,

    @Min(value = 1, message = "El puerto debe ser mayor que 0")
    @Max(value = 65535, message = "El puerto debe ser menor que 65536")
    int puertoSsh,

    @NotBlank(message = "El usuario SSH no puede estar vacio")
    String usuarioSsh,

    @NotBlank(message = "El metodo de autenticacion es obligatorio")
    String metodoAutenticacion,

    String password,

    String claveSshPrivada
) {}
