package com.autodeploy.controller;

import com.autodeploy.dto.ApiResponse;
import com.autodeploy.dto.EjecutarComandoIaRequest;
import com.autodeploy.dto.MensajeChatRequest;
import com.autodeploy.dto.RespuestaChatIa;
import com.autodeploy.service.AsistenteIaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Tag(name = "Asistente IA", description = "Chat IA con ejecucion de comandos remotos")
@RestController
@RequestMapping("/api/asistente-ia")
public class AsistenteIaController {

    private final AsistenteIaService asistenteIaService;

    public AsistenteIaController(AsistenteIaService asistenteIaService) {
        this.asistenteIaService = asistenteIaService;
    }

    @Operation(summary = "Enviar mensaje al asistente")
    @PostMapping("/mensaje")
    public ResponseEntity<ApiResponse<RespuestaChatIa>> enviarMensaje(@RequestBody @Valid MensajeChatRequest peticion) {
        RespuestaChatIa respuesta = asistenteIaService.procesarMensaje(peticion);
        ApiResponse<RespuestaChatIa> cuerpo = new ApiResponse<>(true, "Respuesta generada", respuesta);
        return ResponseEntity.ok(cuerpo);
    }

    @Operation(summary = "Ejecutar comando tras confirmacion del usuario")
    @PostMapping("/ejecutar")
    public ResponseEntity<ApiResponse<Map<String, String>>> ejecutarComando(@RequestBody @Valid EjecutarComandoIaRequest peticion) {
        String salida = asistenteIaService.ejecutarComandoConfirmado(peticion.servidorId(), peticion.comando());
        Map<String, String> datos = Map.of("salida", salida);
        ApiResponse<Map<String, String>> cuerpo = new ApiResponse<>(true, "Comando ejecutado", datos);
        return ResponseEntity.ok(cuerpo);
    }
}
