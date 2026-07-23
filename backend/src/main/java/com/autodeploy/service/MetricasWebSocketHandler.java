package com.autodeploy.service;

import com.autodeploy.config.JwtHandshakeInterceptor;
import com.autodeploy.model.MetricaServidor;
import com.autodeploy.model.Servidor;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

@Component
public class MetricasWebSocketHandler extends TextWebSocketHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(MetricasWebSocketHandler.class);

    private final ObjectMapper objectMapper;
    private final ServidorService servidorService;
    // Indexadas por usuarioId para evitar fuga cross-tenant
    private final Map<String, Set<WebSocketSession>> sesionesPorUsuario = new ConcurrentHashMap<>();

    public MetricasWebSocketHandler(ObjectMapper objectMapper, ServidorService servidorService) {
        this.objectMapper = objectMapper;
        this.servidorService = servidorService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession sesionWs) {
        String usuarioId = (String) sesionWs.getAttributes().get(JwtHandshakeInterceptor.ATTR_USUARIO_ID);
        if (usuarioId == null || usuarioId.isBlank()) {
            LOGGER.warn("Sesion de metricas sin usuarioId autenticado, cerrando: {}", sesionWs.getId());
            try {
                sesionWs.close(CloseStatus.POLICY_VIOLATION);
            } catch (Exception ignorado) {
                // best effort
            }
            return;
        }
        sesionesPorUsuario.computeIfAbsent(usuarioId, k -> new CopyOnWriteArraySet<>()).add(sesionWs);
        LOGGER.info("Cliente conectado al canal de metricas para usuario {}: {}", usuarioId, sesionWs.getId());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession sesionWs, CloseStatus estado) {
        String usuarioId = (String) sesionWs.getAttributes().get(JwtHandshakeInterceptor.ATTR_USUARIO_ID);
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
        LOGGER.info("Cliente desconectado del canal de metricas para usuario {}: {}", usuarioId, sesionWs.getId());
    }

    public void difundirMetrica(MetricaServidor metrica) {
        String servidorId = metrica.getServidorId();
        if (servidorId == null) {
            return;
        }

        Servidor servidor;
        try {
            servidor = servidorService.obtenerPorId(servidorId);
        } catch (Exception excepcion) {
            LOGGER.debug("Servidor no encontrado al difundir metrica: {}", servidorId);
            return;
        }

        String usuarioDuenio = servidor.getUsuarioId();
        if (usuarioDuenio == null) {
            // Servidor sin dueño asignado: nada que difundir (evita NPE en
            // sesionesPorUsuario.get(null), que rompía la tarea programada).
            return;
        }
        Set<WebSocketSession> sesionesDelUsuario = sesionesPorUsuario.get(usuarioDuenio);
        if (sesionesDelUsuario == null || sesionesDelUsuario.isEmpty()) {
            return;
        }

        try {
            String jsonMetrica = objectMapper.writeValueAsString(metrica);
            TextMessage mensajeTexto = new TextMessage(jsonMetrica);
            for (WebSocketSession sesion : sesionesDelUsuario) {
                if (sesion.isOpen()) {
                    try {
                        sesion.sendMessage(mensajeTexto);
                    } catch (Exception excepcionEnvio) {
                        LOGGER.debug("Error enviando metrica a {}: {}", sesion.getId(), excepcionEnvio.getMessage());
                    }
                }
            }
        } catch (Exception excepcionSerializacion) {
            LOGGER.warn("Error serializando metrica: {}", excepcionSerializacion.getMessage());
        }
    }
}
