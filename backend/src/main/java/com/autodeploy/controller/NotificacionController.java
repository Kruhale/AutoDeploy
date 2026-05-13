package com.autodeploy.controller;

import com.autodeploy.dto.ApiResponse;
import com.autodeploy.dto.NotificacionDTO;
import com.autodeploy.model.Notificacion;
import com.autodeploy.service.NotificacionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@Tag(name = "Notificaciones", description = "Gestión de notificaciones del usuario")
@RestController
@RequestMapping("/api/notificaciones")
public class NotificacionController {

	private final NotificacionService notificacionService;

	public NotificacionController(NotificacionService notificacionService) {
		this.notificacionService = notificacionService;
	}

	@Operation(summary = "Listar notificaciones", description = "Obtiene todas las notificaciones del usuario")
	@GetMapping("/usuario/{usuarioId}")
	public ResponseEntity<ApiResponse<List<NotificacionDTO>>> listarPorUsuario(@PathVariable String usuarioId) {
		List<NotificacionDTO> notificaciones = notificacionService.listarPorUsuario(usuarioId);
		ApiResponse<List<NotificacionDTO>> respuesta = new ApiResponse<>(true, "OK", notificaciones);
		return ResponseEntity.ok(respuesta);
	}

	@Operation(summary = "Notificaciones no leídas", description = "Obtiene solo las notificaciones no leídas")
	@GetMapping("/usuario/{usuarioId}/no-leidas")
	public ResponseEntity<ApiResponse<List<NotificacionDTO>>> listarNoLeidas(@PathVariable String usuarioId) {
		List<NotificacionDTO> notificacionesNoLeidas = notificacionService.listarNoLeidas(usuarioId);
		ApiResponse<List<NotificacionDTO>> respuesta = new ApiResponse<>(true, "OK", notificacionesNoLeidas);
		return ResponseEntity.ok(respuesta);
	}

	@Operation(summary = "Contar no leídas", description = "Obtiene el número de notificaciones no leídas")
	@GetMapping("/usuario/{usuarioId}/contar-no-leidas")
	public ResponseEntity<ApiResponse<Long>> contarNoLeidas(@PathVariable String usuarioId) {
		long cantidadNoLeidas = notificacionService.contarNoLeidas(usuarioId);
		ApiResponse<Long> respuesta = new ApiResponse<>(true, "OK", cantidadNoLeidas);
		return ResponseEntity.ok(respuesta);
	}

	@Operation(summary = "Marcar como leída", description = "Marca una notificación como leída")
	@PutMapping("/{notificacionId}/marcar-leida")
	public ResponseEntity<ApiResponse<Void>> marcarComoLeida(@PathVariable String notificacionId) {
		notificacionService.marcarComoLeida(notificacionId);
		ApiResponse<Void> respuesta = new ApiResponse<>(true, "Notificación marcada como leída", null);
		return ResponseEntity.ok(respuesta);
	}

	@Operation(summary = "Marcar todas como leídas", description = "Marca todas las notificaciones como leídas")
	@PutMapping("/usuario/{usuarioId}/marcar-todas-leidas")
	public ResponseEntity<ApiResponse<Void>> marcarTodasComoLeidas(@PathVariable String usuarioId) {
		notificacionService.marcarTodasComoLeidas(usuarioId);
		ApiResponse<Void> respuesta = new ApiResponse<>(true, "Todas las notificaciones marcadas como leídas", null);
		return ResponseEntity.ok(respuesta);
	}

	@Operation(summary = "Eliminar notificación", description = "Elimina una notificación")
	@DeleteMapping("/{notificacionId}")
	public ResponseEntity<ApiResponse<Void>> eliminar(@PathVariable String notificacionId) {
		notificacionService.eliminarNotificacion(notificacionId);
		ApiResponse<Void> respuesta = new ApiResponse<>(true, "Notificación eliminada", null);
		return ResponseEntity.ok(respuesta);
	}
}
