package com.autodeploy.service;

import com.autodeploy.dto.NotificacionDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.net.URI;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

@Component
public class NotificacionesWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(NotificacionesWebSocketHandler.class);
    // Misma clave que usa JwtHandshakeInterceptor para guardar el userId del token
    private static final String ATTR_USUARIO_ID = "usuarioId";

    private final ObjectMapper objectMapper;
    private final Map<String, Set<WebSocketSession>> sesionesPorUsuario = new ConcurrentHashMap<>();

    public NotificacionesWebSocketHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession sesionWs) {
        String usuarioIdDelPath = extraerUsuarioId(sesionWs);

        if (usuarioIdDelPath == null) {
            log.warn("Conexion WS notificaciones sin usuarioId en el path, cerrando");
            cerrarSesion(sesionWs, CloseStatus.BAD_DATA);
            return;
        }

        // IDOR: comparar el userId del path con el userId del token (puesto por el interceptor)
        String usuarioIdDelToken = (String) sesionWs.getAttributes().get(ATTR_USUARIO_ID);
        if (!usuarioIdDelPath.equals(usuarioIdDelToken)) {
            log.warn("Conexion WS notificaciones rechazada: userId del path '{}' no coincide con el token", usuarioIdDelPath);
            cerrarSesion(sesionWs, CloseStatus.POLICY_VIOLATION);
            return;
        }

        sesionWs.getAttributes().put(ATTR_USUARIO_ID, usuarioIdDelPath);
        sesionesPorUsuario.computeIfAbsent(usuarioIdDelPath, k -> new CopyOnWriteArraySet<>()).add(sesionWs);
        log.info("Cliente conectado a notificaciones para usuario {}: {}", usuarioIdDelPath, sesionWs.getId());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession sesionWs, CloseStatus estado) {
        String usuarioId = (String) sesionWs.getAttributes().get(ATTR_USUARIO_ID);
        if (usuarioId == null) {
            return;
        }

        Set<WebSocketSession> sesionesDelUsuario = sesionesPorUsuario.get(usuarioId);
        if (sesionesDelUsuario != null) {
            sesionesDelUsuario.remove(sesionWs);
            if (sesionesDelUsuario.isEmpty()) {
                sesionesPorUsuario.remove(usuarioId);
            }
        }
        log.info("Cliente desconectado de notificaciones para usuario {}: {}", usuarioId, sesionWs.getId());
    }

    public void notificarUsuario(String usuarioId, NotificacionDTO notificacion) {
        Set<WebSocketSession> sesionesDelUsuario = sesionesPorUsuario.get(usuarioId);
        if (sesionesDelUsuario == null || sesionesDelUsuario.isEmpty()) {
            return;
        }

        String mensajeJson;
        try {
            mensajeJson = objectMapper.writeValueAsString(notificacion);
        } catch (Exception excepcion) {
            log.error("Error serializando notificacion para usuario {}", usuarioId, excepcion);
            return;
        }

        TextMessage mensaje = new TextMessage(mensajeJson);
        for (WebSocketSession sesion : sesionesDelUsuario) {
            if (!sesion.isOpen()) {
                continue;
            }
            try {
                sesion.sendMessage(mensaje);
            } catch (Exception excepcion) {
                log.debug("No se pudo enviar notificacion a {}: {}", sesion.getId(), excepcion.getMessage());
            }
        }
    }

    private void cerrarSesion(WebSocketSession sesionWs, CloseStatus estado) {
        try {
            sesionWs.close(estado);
        } catch (Exception ignorado) {
            // Cierre best-effort, sin propagar
        }
    }

    private String extraerUsuarioId(WebSocketSession sesionWs) {
        URI uri = sesionWs.getUri();
        if (uri == null) {
            return null;
        }

        String path = uri.getPath();
        if (path == null) {
            return null;
        }

        int ultimoSeparador = path.lastIndexOf('/');
        if (ultimoSeparador < 0 || ultimoSeparador >= path.length() - 1) {
            return null;
        }

        String posibleId = path.substring(ultimoSeparador + 1);
        if (posibleId.isBlank() || "notificaciones".equals(posibleId)) {
            return null;
        }
        return posibleId;
    }
}
