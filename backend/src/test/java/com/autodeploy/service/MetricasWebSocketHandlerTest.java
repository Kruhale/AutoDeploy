package com.autodeploy.service;

import com.autodeploy.model.MetricaServidor;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class MetricasWebSocketHandlerTest {

    @Mock private WebSocketSession sesion1;
    @Mock private WebSocketSession sesion2;

    private MetricasWebSocketHandler handler;

    @BeforeEach
    void setUp() {
        handler = new MetricasWebSocketHandler(new ObjectMapper().findAndRegisterModules());
        when(sesion1.getId()).thenReturn("s1");
        when(sesion2.getId()).thenReturn("s2");
    }

    @Test
    @DisplayName("difundirMetrica: no hace nada si no hay sesiones")
    void difundir_sinSesiones() throws Exception {
        MetricaServidor m = new MetricaServidor();
        m.setServidorId("srv-1");

        handler.difundirMetrica(m);

        verify(sesion1, never()).sendMessage(any(TextMessage.class));
        verify(sesion2, never()).sendMessage(any(TextMessage.class));
    }

    @Test
    @DisplayName("difundirMetrica: envia mensaje a todas las sesiones abiertas")
    void difundir_aTodasLasAbiertas() throws Exception {
        when(sesion1.isOpen()).thenReturn(true);
        when(sesion2.isOpen()).thenReturn(true);
        handler.afterConnectionEstablished(sesion1);
        handler.afterConnectionEstablished(sesion2);

        MetricaServidor m = new MetricaServidor();
        m.setServidorId("srv-1");
        m.setCpuPorcentaje(50);

        handler.difundirMetrica(m);

        verify(sesion1, times(1)).sendMessage(any(TextMessage.class));
        verify(sesion2, times(1)).sendMessage(any(TextMessage.class));
    }

    @Test
    @DisplayName("difundirMetrica: ignora sesiones cerradas (isOpen=false)")
    void difundir_ignoraCerradas() throws Exception {
        when(sesion1.isOpen()).thenReturn(true);
        when(sesion2.isOpen()).thenReturn(false);
        handler.afterConnectionEstablished(sesion1);
        handler.afterConnectionEstablished(sesion2);

        MetricaServidor m = new MetricaServidor();
        m.setServidorId("srv-1");

        handler.difundirMetrica(m);

        verify(sesion1, times(1)).sendMessage(any(TextMessage.class));
        verify(sesion2, never()).sendMessage(any(TextMessage.class));
    }

    @Test
    @DisplayName("afterConnectionClosed: elimina la sesion del set")
    void cerrarConexion_eliminaSesion() throws Exception {
        when(sesion1.isOpen()).thenReturn(true);
        handler.afterConnectionEstablished(sesion1);
        handler.afterConnectionClosed(sesion1, CloseStatus.NORMAL);

        MetricaServidor m = new MetricaServidor();
        m.setServidorId("srv-1");

        handler.difundirMetrica(m);
        verify(sesion1, never()).sendMessage(any(TextMessage.class));
    }
}
