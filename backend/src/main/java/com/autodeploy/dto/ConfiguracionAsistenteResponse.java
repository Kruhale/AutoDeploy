package com.autodeploy.dto;

import java.util.List;

public record ConfiguracionAsistenteResponse(
    boolean apiKeyConfigurada,
    String modeloPreferido,
    List<String> comandosAutoAprobados
) {}
