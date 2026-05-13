package com.autodeploy.service;

import com.autodeploy.dto.NotificacionDTO;
import com.autodeploy.model.Notificacion;
import com.autodeploy.repository.NotificacionRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class NotificacionService {

	private final NotificacionRepository notificacionRepository;

	public NotificacionService(NotificacionRepository notificacionRepository) {
		this.notificacionRepository = notificacionRepository;
	}

	public Notificacion crearNotificacion(String tipo, String titulo, String descripcion, String usuarioId) {
		Notificacion notificacionNueva = new Notificacion(tipo, titulo, descripcion, usuarioId);
		return notificacionRepository.save(notificacionNueva);
	}

	public List<NotificacionDTO> listarPorUsuario(String usuarioId) {
		List<Notificacion> notificacionesDelUsuario = notificacionRepository.findByUsuarioIdOrderByFechaCreacionDesc(usuarioId);
		return notificacionesDelUsuario.stream()
			.map(notif -> new NotificacionDTO(notif.getId(), notif.getTipo(), notif.getTitulo(), notif.getDescripcion(), notif.isLeida(), notif.getFechaCreacion()))
			.collect(Collectors.toList());
	}

	public List<NotificacionDTO> listarNoLeidas(String usuarioId) {
		List<Notificacion> notificacionesNoLeidas = notificacionRepository.findByUsuarioIdAndLeidaFalseOrderByFechaCreacionDesc(usuarioId);
		return notificacionesNoLeidas.stream()
			.map(notif -> new NotificacionDTO(notif.getId(), notif.getTipo(), notif.getTitulo(), notif.getDescripcion(), notif.isLeida(), notif.getFechaCreacion()))
			.collect(Collectors.toList());
	}

	public long contarNoLeidas(String usuarioId) {
		return notificacionRepository.countByUsuarioIdAndLeidaFalse(usuarioId);
	}

	public void marcarComoLeida(String notificacionId) {
		Notificacion notificacion = notificacionRepository.findById(notificacionId).orElse(null);
		if (notificacion != null) {
			notificacion.setLeida(true);
			notificacionRepository.save(notificacion);
		}
	}

	public void marcarTodasComoLeidas(String usuarioId) {
		List<Notificacion> notificacionesNoLeidas = notificacionRepository.findByUsuarioIdAndLeidaFalseOrderByFechaCreacionDesc(usuarioId);
		notificacionesNoLeidas.forEach(notif -> notif.setLeida(true));
		notificacionRepository.saveAll(notificacionesNoLeidas);
	}

	public void eliminarNotificacion(String notificacionId) {
		notificacionRepository.deleteById(notificacionId);
	}
}
