package com.autodeploy.controller;

import com.autodeploy.config.Seguridad;
import com.autodeploy.dto.ApiResponse;
import com.autodeploy.dto.EjecutarComandoIaRequest;
import com.autodeploy.dto.MensajeChatRequest;
import com.autodeploy.dto.RespuestaChatIa;
import com.autodeploy.service.AsistenteIaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Tag(name = "Asistente IA", description = "Chat IA con ejecucion de comandos remotos")
@RestController
@RequestMapping("/api/asistente-ia")
@PreAuthorize("isAuthenticated()")
public class AsistenteIaController {

    private final AsistenteIaService asistenteIaService;
    private final Seguridad seguridad;

    public AsistenteIaController(AsistenteIaService asistenteIaService, Seguridad seguridad) {
        this.asistenteIaService = asistenteIaService;
        this.seguridad = seguridad;
    }

    @Operation(summary = "Enviar mensaje al asistente. Si la peticion incluye un servidorId, debe ser de un servidor del usuario.")
    @PostMapping("/mensaje")
    public ResponseEntity<ApiResponse<RespuestaChatIa>> enviarMensaje(@RequestBody @Valid MensajeChatRequest peticion,
                                                                       Authentication autenticacion) {
        if (peticion.servidorId() != null && !peticion.servidorId().isBlank()) {
            verificarPropietarioDeServidor(peticion.servidorId(), autenticacion);
        }
        // Usar siempre el userId del token, nunca el del body, para evitar IDOR
        String usuarioIdAutenticado = autenticacion.getName();
        RespuestaChatIa respuesta = asistenteIaService.procesarMensaje(peticion, usuarioIdAutenticado);
        ApiResponse<RespuestaChatIa> cuerpo = new ApiResponse<>(true, "Respuesta generada", respuesta);
        return ResponseEntity.ok(cuerpo);
    }

    @Operation(summary = "Ejecutar comando tras confirmacion del usuario en un servidor propio")
    @PostMapping("/ejecutar")
    public ResponseEntity<ApiResponse<Map<String, String>>> ejecutarComando(@RequestBody @Valid EjecutarComandoIaRequest peticion,
                                                                              Authentication autenticacion) {
        verificarPropietarioDeServidor(peticion.servidorId(), autenticacion);
        String salida = asistenteIaService.ejecutarComandoConfirmado(peticion.servidorId(), peticion.comando());
        Map<String, String> datos = Map.of("salida", salida);
        ApiResponse<Map<String, String>> cuerpo = new ApiResponse<>(true, "Comando ejecutado", datos);
        return ResponseEntity.ok(cuerpo);
    }

    private void verificarPropietarioDeServidor(String servidorId, Authentication autenticacion) {
        if (seguridad.esAdmin(autenticacion) || seguridad.esDuenioDelServidor(servidorId, autenticacion)) {
            return;
        }
        throw new AccessDeniedException("El servidor no pertenece al usuario autenticado");
    }
}
