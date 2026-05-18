package com.autodeploy.dto;

public record RespuestaChatIa(
    String respuesta,
    String comandoPropuesto,
    String razonamiento,
    boolean requiereConfirmacion,
    String salidaComandoAutoEjecutado
) {}
