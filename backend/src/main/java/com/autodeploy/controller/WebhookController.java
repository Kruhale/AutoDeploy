package com.autodeploy.controller;

import com.autodeploy.dto.ApiResponse;
import com.autodeploy.model.Despliegue;
import com.autodeploy.model.Servidor;
import com.autodeploy.service.DespliegueService;
import com.autodeploy.service.GitDeployService;
import com.autodeploy.service.ServidorService;
import com.fasterxml.jackson.databind.JsonNode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Optional;

@Tag(name = "Webhooks", description = "Endpoints para que GitHub/GitLab disparen auto-deploys cuando llega un push. Publico (autenticado por tokenWebhook generado por AutoDeploy al crear el despliegue Git).")
@RestController
@RequestMapping("/api/webhooks")
public class WebhookController {

    private final DespliegueService despliegueService;
    private final ServidorService servidorService;
    private final GitDeployService gitDeployService;

    public WebhookController(DespliegueService despliegueService, ServidorService servidorService, GitDeployService gitDeployService) {
        this.despliegueService = despliegueService;
        this.servidorService = servidorService;
        this.gitDeployService = gitDeployService;
    }

    @Operation(summary = "Recibir evento push de Git", description = "Endpoint llamado por GitHub/GitLab al hacer push. Solo dispara deploy si el evento es push, el token pertenece a un despliegue conocido y la rama coincide con la configurada. El payload se espera en formato JSON estandar de GitHub/GitLab.")
    @PostMapping("/git/{tokenWebhook}")
    public ResponseEntity<ApiResponse<Map<String, String>>> recibirEventoGit(
            @PathVariable String tokenWebhook,
            @RequestHeader(value = "X-GitHub-Event", required = false) String tipoEventoGithub,
            @RequestHeader(value = "X-Gitlab-Event", required = false) String tipoEventoGitlab,
            @RequestBody(required = false) JsonNode cuerpoPayload
    ) {
        Optional<Despliegue> despliegueAsociado = despliegueService.buscarPorTokenWebhook(tokenWebhook);
        boolean tokenInvalido = despliegueAsociado.isEmpty();
        if (tokenInvalido) {
            ApiResponse<Map<String, String>> cuerpoNoAutorizado = new ApiResponse<>(false, "Token de webhook desconocido", Map.of());
            return ResponseEntity.status(404).body(cuerpoNoAutorizado);
        }

        Despliegue despliegueOriginal = despliegueAsociado.get();

        boolean esEventoPush = esPushValido(tipoEventoGithub, tipoEventoGitlab);
        if (!esEventoPush) {
            Map<String, String> ignorado = Map.of(
                    "estado", "ignorado",
                    "motivo", "El evento no es un push o no llega cabecera reconocida"
            );
            return ResponseEntity.ok(new ApiResponse<>(true, "Evento ignorado", ignorado));
        }

        Optional<String> ramaDelPush = extraerRamaDePayload(cuerpoPayload);
        boolean ramaCoincide = ramaDelPush.isEmpty() || despliegueOriginal.getRama() == null || ramaDelPush.get().equals(despliegueOriginal.getRama());
        if (!ramaCoincide) {
            Map<String, String> ignorado = Map.of(
                    "estado", "ignorado",
                    "motivo", "La rama " + ramaDelPush.get() + " no coincide con la configurada (" + despliegueOriginal.getRama() + ")"
            );
            return ResponseEntity.ok(new ApiResponse<>(true, "Evento ignorado", ignorado));
        }

        Servidor servidor = servidorService.obtenerPorId(despliegueOriginal.getServidorId());
        Despliegue nuevoDespliegue = despliegueService.registrar(servidor.getId(), "git-webhook", despliegueOriginal.getUrl());
        despliegueService.actualizarMetadatosGit(
                nuevoDespliegue.getId(),
                despliegueOriginal.getTecnologia(),
                despliegueOriginal.getRama(),
                despliegueOriginal.getDirectorioRemoto(),
                despliegueOriginal.getTokenWebhook()
        );

        try {
            String salidaDelComando = gitDeployService.desplegarConGit(servidor, despliegueOriginal.getUrl(), despliegueOriginal.getDirectorioRemoto());
            despliegueService.completar(nuevoDespliegue.getId(), salidaDelComando);

            Map<String, String> resultado = Map.of(
                    "estado", "desplegado",
                    "despliegueId", nuevoDespliegue.getId(),
                    "rama", ramaDelPush.orElse(despliegueOriginal.getRama() != null ? despliegueOriginal.getRama() : "main")
            );
            return ResponseEntity.ok(new ApiResponse<>(true, "Auto-deploy disparado", resultado));
        } catch (Exception fallo) {
            despliegueService.fallar(nuevoDespliegue.getId(), fallo.getMessage());
            Map<String, String> errorMap = Map.of(
                    "estado", "fallido",
                    "despliegueId", nuevoDespliegue.getId(),
                    "error", fallo.getMessage()
            );
            return ResponseEntity.status(500).body(new ApiResponse<>(false, "Auto-deploy fallido", errorMap));
        }
    }

    private boolean esPushValido(String eventoGithub, String eventoGitlab) {
        boolean esPushGithub = "push".equalsIgnoreCase(eventoGithub);
        boolean esPushGitlab = eventoGitlab != null && eventoGitlab.toLowerCase().contains("push");
        return esPushGithub || esPushGitlab;
    }

    private Optional<String> extraerRamaDePayload(JsonNode payload) {
        if (payload == null) {
            return Optional.empty();
        }

        String refRecibida = payload.path("ref").asText("");
        if (refRecibida.startsWith("refs/heads/")) {
            return Optional.of(refRecibida.substring("refs/heads/".length()));
        }

        String ramaAlternativa = payload.path("branch").asText("");
        if (!ramaAlternativa.isBlank()) {
            return Optional.of(ramaAlternativa);
        }

        return Optional.empty();
    }
}
