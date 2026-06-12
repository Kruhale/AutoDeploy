package com.autodeploy.controller;

import com.autodeploy.config.Seguridad;
import com.autodeploy.dto.ApiResponse;
import com.autodeploy.dto.NotificacionDTO;
import com.autodeploy.model.Notificacion;
import com.autodeploy.repository.NotificacionRepository;
import com.autodeploy.service.NotificacionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
import java.util.Map;

@Tag(name = "Notificaciones", description = "Gestión de notificaciones del usuario")
@RestController
@RequestMapping("/api/notificaciones")
@PreAuthorize("isAuthenticated()")
public class NotificacionController {

	private final NotificacionService notificacionService;
	private final NotificacionRepository notificacionRepository;
	private final Seguridad seguridad;

	public NotificacionController(NotificacionService notificacionService,
	                              NotificacionRepository notificacionRepository,
	                              Seguridad seguridad) {
		this.notificacionService = notificacionService;
		this.notificacionRepository = notificacionRepository;
		this.seguridad = seguridad;
	}

	@Operation(summary = "Crear notificación", description = "Solo ADMIN puede crear notificaciones para usuarios. Las del sistema se crean internamente desde otros servicios.")
	@PostMapping
	@PreAuthorize("hasRole('ADMIN')")
	public ResponseEntity<ApiResponse<NotificacionDTO>> crear(@RequestBody Map<String, String> peticion) {
		String usuarioId = peticion.get("usuarioId");
		String tipo = peticion.getOrDefault("tipo", "info");
		String titulo = peticion.getOrDefault("titulo", "Notificación");
		String descripcion = peticion.getOrDefault("descripcion", "");

		Notificacion notificacionCreada = notificacionService.crearNotificacion(tipo, titulo, descripcion, usuarioId);
		NotificacionDTO dto = new NotificacionDTO(
			notificacionCreada.getId(),
			notificacionCreada.getTipo(),
			notificacionCreada.getTitulo(),
			notificacionCreada.getDescripcion(),
			notificacionCreada.isLeida(),
			notificacionCreada.getFechaCreacion()
		);
		ApiResponse<NotificacionDTO> respuesta = new ApiResponse<>(true, "Notificación creada", dto);
		return ResponseEntity.ok(respuesta);
	}

	@Operation(summary = "Listar notificaciones", description = "Obtiene todas las notificaciones del usuario")
	@GetMapping("/usuario/{usuarioId}")
	@PreAuthorize("hasRole('ADMIN') or @seguridad.esElMismoUsuario(#usuarioId, authentication)")
	public ResponseEntity<ApiResponse<List<NotificacionDTO>>> listarPorUsuario(@PathVariable String usuarioId) {
		List<NotificacionDTO> notificaciones = notificacionService.listarPorUsuario(usuarioId);
		ApiResponse<List<NotificacionDTO>> respuesta = new ApiResponse<>(true, "OK", notificaciones);
		return ResponseEntity.ok(respuesta);
	}

	@Operation(summary = "Listar notificaciones paginadas", description = "Soporta ?page=0&size=20")
	@GetMapping("/usuario/{usuarioId}/paginadas")
	@PreAuthorize("hasRole('ADMIN') or @seguridad.esElMismoUsuario(#usuarioId, authentication)")
	public ResponseEntity<ApiResponse<Page<Notificacion>>> listarPorUsuarioPaginadas(@PathVariable String usuarioId, Pageable pageable) {
		Page<Notificacion> pagina = notificacionRepository.findByUsuarioIdOrderByFechaCreacionDesc(usuarioId, pageable);
		return ResponseEntity.ok(new ApiResponse<>(true, "OK", pagina));
	}

	@Operation(summary = "Notificaciones no leídas", description = "Obtiene solo las notificaciones no leídas")
	@GetMapping("/usuario/{usuarioId}/no-leidas")
	@PreAuthorize("hasRole('ADMIN') or @seguridad.esElMismoUsuario(#usuarioId, authentication)")
	public ResponseEntity<ApiResponse<List<NotificacionDTO>>> listarNoLeidas(@PathVariable String usuarioId) {
		List<NotificacionDTO> notificacionesNoLeidas = notificacionService.listarNoLeidas(usuarioId);
		ApiResponse<List<NotificacionDTO>> respuesta = new ApiResponse<>(true, "OK", notificacionesNoLeidas);
		return ResponseEntity.ok(respuesta);
	}

	@Operation(summary = "Contar no leídas", description = "Obtiene el número de notificaciones no leídas")
	@GetMapping("/usuario/{usuarioId}/contar-no-leidas")
	@PreAuthorize("hasRole('ADMIN') or @seguridad.esElMismoUsuario(#usuarioId, authentication)")
	public ResponseEntity<ApiResponse<Long>> contarNoLeidas(@PathVariable String usuarioId) {
		long cantidadNoLeidas = notificacionService.contarNoLeidas(usuarioId);
		ApiResponse<Long> respuesta = new ApiResponse<>(true, "OK", cantidadNoLeidas);
		return ResponseEntity.ok(respuesta);
	}

	@Operation(summary = "Marcar como leída", description = "Marca una notificación como leída")
	@PutMapping("/{notificacionId}/marcar-leida")
	public ResponseEntity<ApiResponse<Void>> marcarComoLeida(@PathVariable String notificacionId,
	                                                          Authentication autenticacion) {
		verificarPropietarioDeNotificacion(notificacionId, autenticacion);
		notificacionService.marcarComoLeida(notificacionId);
		ApiResponse<Void> respuesta = new ApiResponse<>(true, "Notificación marcada como leída", null);
		return ResponseEntity.ok(respuesta);
	}

	@Operation(summary = "Marcar todas como leídas", description = "Marca todas las notificaciones como leídas")
	@PutMapping("/usuario/{usuarioId}/marcar-todas-leidas")
	@PreAuthorize("hasRole('ADMIN') or @seguridad.esElMismoUsuario(#usuarioId, authentication)")
	public ResponseEntity<ApiResponse<Void>> marcarTodasComoLeidas(@PathVariable String usuarioId) {
		notificacionService.marcarTodasComoLeidas(usuarioId);
		ApiResponse<Void> respuesta = new ApiResponse<>(true, "Todas las notificaciones marcadas como leídas", null);
		return ResponseEntity.ok(respuesta);
	}

	@Operation(summary = "Eliminar notificación", description = "Elimina una notificación")
	@DeleteMapping("/{notificacionId}")
	public ResponseEntity<ApiResponse<Void>> eliminar(@PathVariable String notificacionId,
	                                                   Authentication autenticacion) {
		verificarPropietarioDeNotificacion(notificacionId, autenticacion);
		notificacionService.eliminarNotificacion(notificacionId);
		ApiResponse<Void> respuesta = new ApiResponse<>(true, "Notificación eliminada", null);
		return ResponseEntity.ok(respuesta);
	}

	private void verificarPropietarioDeNotificacion(String notificacionId, Authentication autenticacion) {
		Notificacion notif = notificacionRepository.findById(notificacionId).orElse(null);
		if (notif == null) {
			return;
		}
		if (seguridad.esAdmin(autenticacion) || seguridad.esElMismoUsuario(notif.getUsuarioId(), autenticacion)) {
			return;
		}
		throw new AccessDeniedException("La notificacion no pertenece al usuario autenticado");
	}
}
