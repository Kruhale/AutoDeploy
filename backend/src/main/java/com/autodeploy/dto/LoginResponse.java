package com.autodeploy.dto;

import java.time.LocalDateTime;

public record LoginResponse(String id, String nombre, String email, String token, String plan, LocalDateTime fechaFinSuscripcion) {}
