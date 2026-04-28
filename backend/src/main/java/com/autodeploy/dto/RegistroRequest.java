package com.autodeploy.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegistroRequest(
    @NotBlank(message = "El nombre no puede estar vacio")
    String nombre,

    @NotBlank(message = "El email no puede estar vacio")
    @Email(message = "El email no tiene un formato valido")
    String email,

    @NotBlank(message = "La password no puede estar vacia")
    @Size(min = 6, message = "La password debe tener al menos 6 caracteres")
    String password
) {}
