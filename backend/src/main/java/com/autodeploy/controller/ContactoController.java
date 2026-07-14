package com.autodeploy.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * Formulario de contacto público. Reenvía el mensaje a un webhook de Discord
 * (URL inyectada por DISCORD_CONTACTO_WEBHOOK, nunca versionada). Antes el
 * formulario abría un mailto y dependía del cliente de correo del visitante.
 */
@RestController
@RequestMapping("/api/contacto")
public class ContactoController {

    @Value("${autodeploy.discord.contacto-webhook:}")
    private String webhookDiscord;

    private final RestTemplate restTemplate = new RestTemplate();

    public record ContactoRequest(String nombre, String email, String asunto, String mensaje) {
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> enviar(@RequestBody ContactoRequest req) {
        if (esVacio(req.email()) || esVacio(req.asunto()) || esVacio(req.mensaje())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("ok", false, "error", "Faltan campos obligatorios (email, asunto y mensaje)."));
        }
        if (esVacio(webhookDiscord)) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("ok", false, "error", "El contacto no esta configurado en el servidor."));
        }

        String descripcion = "**Nombre:** " + (esVacio(req.nombre()) ? "(sin nombre)" : req.nombre())
                + "\n**Email:** " + req.email()
                + "\n**Asunto:** " + req.asunto()
                + "\n**Mensaje:**\n" + req.mensaje();
        if (descripcion.length() > 4000) {
            descripcion = descripcion.substring(0, 4000);
        }

        Map<String, Object> payload = Map.of(
                "username", "AutoDeploy · contacto",
                "embeds", List.of(Map.of(
                        "title", "📨 Nuevo mensaje de contacto",
                        "color", 5793266,
                        "description", descripcion)));

        try {
            HttpHeaders cabeceras = new HttpHeaders();
            cabeceras.setContentType(MediaType.APPLICATION_JSON);
            restTemplate.postForEntity(webhookDiscord, new HttpEntity<>(payload, cabeceras), String.class);
            return ResponseEntity.ok(Map.of("ok", true, "message", "¡Mensaje recibido! Te responderemos pronto."));
        } catch (Exception excepcion) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("ok", false, "error", "No se pudo entregar el mensaje. Intentalo mas tarde."));
        }
    }

    private boolean esVacio(String valor) {
        return valor == null || valor.isBlank();
    }
}
