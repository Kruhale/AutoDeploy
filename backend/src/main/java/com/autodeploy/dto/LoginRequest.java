package com.autodeploy.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
    @NotBlank(message = "El email no puede estar vacio")
    @Email(message = "El email no tiene un formato valido")
    String email,

    @NotBlank(message = "La password no puede estar vacia")
    String password
) {}
