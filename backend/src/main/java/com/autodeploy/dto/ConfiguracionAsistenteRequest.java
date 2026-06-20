package com.autodeploy.dto;

import java.util.List;

public record ConfiguracionAsistenteRequest(
    String apiKey,
    String modeloPreferido,
    List<String> comandosAutoAprobados
) {}
