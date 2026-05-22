package com.autodeploy.service;

import com.autodeploy.dto.NotificacionDTO;
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

import java.net.URI;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class NotificacionesWebSocketHandlerTest {

    @Mock
    private WebSocketSession sesion;

    private NotificacionesWebSocketHandler handler;
    private Map<String, Object> atributos;

    @BeforeEach
    void setUp() {
        // findAndRegisterModules() activa el JavaTimeModule, necesario para serializar LocalDateTime
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
        handler = new NotificacionesWebSocketHandler(objectMapper);
        atributos = new HashMap<>();
        when(sesion.getAttributes()).thenReturn(atributos);
        when(sesion.getId()).thenReturn("session-1");
    }

    @Test
    @DisplayName("afterConnectionEstablished: registra la sesion cuando la URI termina en /usuario-1")
    void registraConUsuarioIdValido() throws Exception {
        when(sesion.getUri()).thenReturn(URI.create("ws://localhost/ws/notificaciones/usuario-1"));

        handler.afterConnectionEstablished(sesion);

        assertThat(atributos).containsEntry("usuarioId", "usuario-1");
    }

    @Test
    @DisplayName("afterConnectionEstablished: cierra la sesion cuando el path acaba en /")
    void cierraSiSinUsuarioId() throws Exception {
        when(sesion.getUri()).thenReturn(URI.create("ws://localhost/ws/notificaciones/"));

        handler.afterConnectionEstablished(sesion);

        verify(sesion).close(CloseStatus.BAD_DATA);
    }

    @Test
    @DisplayName("afterConnectionEstablished: cierra la sesion cuando el ultimo segmento es 'notificaciones'")
    void cierraSiPathRaiz() throws Exception {
        when(sesion.getUri()).thenReturn(URI.create("ws://localhost/ws/notificaciones"));

        handler.afterConnectionEstablished(sesion);

        verify(sesion).close(CloseStatus.BAD_DATA);
    }

    @Test
    @DisplayName("afterConnectionEstablished: cierra la sesion cuando getUri() es null")
    void cierraSiUriNull() throws Exception {
        when(sesion.getUri()).thenReturn(null);

        handler.afterConnectionEstablished(sesion);

        verify(sesion).close(CloseStatus.BAD_DATA);
    }

    @Test
    @DisplayName("notificarUsuario: no envia si no hay sesiones para ese usuario")
    void notificarUsuario_sinSesiones() throws Exception {
        NotificacionDTO dto = new NotificacionDTO("n-1", "info", "T", "D", false, LocalDateTime.now());

        handler.notificarUsuario("usuario-x", dto);

        verify(sesion, never()).sendMessage(any(TextMessage.class));
    }

    @Test
    @DisplayName("notificarUsuario: envia TextMessage al WebSocket cuando la sesion esta abierta")
    void notificarUsuario_envia() throws Exception {
        when(sesion.getUri()).thenReturn(URI.create("ws://localhost/ws/notificaciones/usuario-1"));
        when(sesion.isOpen()).thenReturn(true);
        handler.afterConnectionEstablished(sesion);

        NotificacionDTO dto = new NotificacionDTO("n-1", "info", "Hola", "Desc", false, LocalDateTime.now());
        handler.notificarUsuario("usuario-1", dto);

        verify(sesion, times(1)).sendMessage(any(TextMessage.class));
    }

    @Test
    @DisplayName("notificarUsuario: ignora sesiones cerradas")
    void notificarUsuario_ignoraCerradas() throws Exception {
        when(sesion.getUri()).thenReturn(URI.create("ws://localhost/ws/notificaciones/usuario-1"));
        when(sesion.isOpen()).thenReturn(false);
        handler.afterConnectionEstablished(sesion);

        NotificacionDTO dto = new NotificacionDTO("n-1", "info", "T", "D", false, LocalDateTime.now());
        handler.notificarUsuario("usuario-1", dto);

        verify(sesion, never()).sendMessage(any(TextMessage.class));
    }

    @Test
    @DisplayName("afterConnectionClosed: limpia la sesion del mapa interno")
    void afterConnectionClosed_limpia() throws Exception {
        when(sesion.getUri()).thenReturn(URI.create("ws://localhost/ws/notificaciones/usuario-1"));
        when(sesion.isOpen()).thenReturn(true);
        handler.afterConnectionEstablished(sesion);
        // atributos["usuarioId"] = "usuario-1" lo puso afterConnectionEstablished

        handler.afterConnectionClosed(sesion, CloseStatus.NORMAL);

        // Tras cerrar, una notificacion al mismo usuarioId NO debe enviar nada
        NotificacionDTO dto = new NotificacionDTO("n-1", "info", "T", "D", false, LocalDateTime.now());
        handler.notificarUsuario("usuario-1", dto);
        verify(sesion, never()).sendMessage(any(TextMessage.class));
    }
}
