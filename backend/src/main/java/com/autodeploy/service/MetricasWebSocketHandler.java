package com.autodeploy.service;

import com.autodeploy.model.MetricaServidor;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.Set;
import java.util.concurrent.CopyOnWriteArraySet;

@Component
public class MetricasWebSocketHandler extends TextWebSocketHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(MetricasWebSocketHandler.class);

    private final Set<WebSocketSession> sesionesAbiertas = new CopyOnWriteArraySet<>();
    private final ObjectMapper objectMapper;

    public MetricasWebSocketHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession sesionWs) {
        sesionesAbiertas.add(sesionWs);
        LOGGER.info("Cliente conectado al canal de metricas: {} (total {})", sesionWs.getId(), sesionesAbiertas.size());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession sesionWs, CloseStatus estado) {
        sesionesAbiertas.remove(sesionWs);
        LOGGER.info("Cliente desconectado del canal de metricas: {}", sesionWs.getId());
    }

    public void difundirMetrica(MetricaServidor metrica) {
        if (sesionesAbiertas.isEmpty()) {
            return;
        }
        try {
            String jsonMetrica = objectMapper.writeValueAsString(metrica);
            TextMessage mensajeTexto = new TextMessage(jsonMetrica);
            for (WebSocketSession sesion : sesionesAbiertas) {
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
