package com.autodeploy.service;

import com.autodeploy.config.JwtHandshakeInterceptor;
import com.autodeploy.model.MetricaServidor;
import com.autodeploy.model.Servidor;
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

import java.util.HashMap;
import java.util.Map;

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
    @Mock private ServidorService servidorService;

    private MetricasWebSocketHandler handler;
    private Map<String, Object> atributos1;
    private Map<String, Object> atributos2;

    @BeforeEach
    void setUp() {
        handler = new MetricasWebSocketHandler(new ObjectMapper().findAndRegisterModules(), servidorService);
        when(sesion1.getId()).thenReturn("s1");
        when(sesion2.getId()).thenReturn("s2");
        atributos1 = new HashMap<>();
        atributos2 = new HashMap<>();
        when(sesion1.getAttributes()).thenReturn(atributos1);
        when(sesion2.getAttributes()).thenReturn(atributos2);
    }

    @Test
    @DisplayName("difundirMetrica: no hace nada si no hay sesiones para ese usuario")
    void difundir_sinSesiones() throws Exception {
        Servidor servidorSinSesion = new Servidor();
        servidorSinSesion.setUsuarioId("u-sin-sesion");
        when(servidorService.obtenerPorId("srv-1")).thenReturn(servidorSinSesion);

        MetricaServidor metrica = new MetricaServidor();
        metrica.setServidorId("srv-1");

        handler.difundirMetrica(metrica);

        verify(sesion1, never()).sendMessage(any(TextMessage.class));
        verify(sesion2, never()).sendMessage(any(TextMessage.class));
    }

    @Test
    @DisplayName("difundirMetrica: envia metrica SOLO al usuario duenio del servidor (no cross-tenant)")
    void difundir_soloAlDuenioDelServidor() throws Exception {
        atributos1.put(JwtHandshakeInterceptor.ATTR_USUARIO_ID, "u-1");
        atributos2.put(JwtHandshakeInterceptor.ATTR_USUARIO_ID, "u-2");

        when(sesion1.isOpen()).thenReturn(true);
        when(sesion2.isOpen()).thenReturn(true);
        handler.afterConnectionEstablished(sesion1);
        handler.afterConnectionEstablished(sesion2);

        Servidor servidorDeU1 = new Servidor();
        servidorDeU1.setUsuarioId("u-1");
        when(servidorService.obtenerPorId("srv-1")).thenReturn(servidorDeU1);

        MetricaServidor metrica = new MetricaServidor();
        metrica.setServidorId("srv-1");
        metrica.setCpuPorcentaje(50);

        handler.difundirMetrica(metrica);

        verify(sesion1, times(1)).sendMessage(any(TextMessage.class));
        verify(sesion2, never()).sendMessage(any(TextMessage.class));
    }

    @Test
    @DisplayName("difundirMetrica: ignora sesiones cerradas (isOpen=false)")
    void difundir_ignoraCerradas() throws Exception {
        atributos1.put(JwtHandshakeInterceptor.ATTR_USUARIO_ID, "u-1");

        when(sesion1.isOpen()).thenReturn(false);
        handler.afterConnectionEstablished(sesion1);

        Servidor servidor = new Servidor();
        servidor.setUsuarioId("u-1");
        when(servidorService.obtenerPorId("srv-1")).thenReturn(servidor);

        MetricaServidor metrica = new MetricaServidor();
        metrica.setServidorId("srv-1");

        handler.difundirMetrica(metrica);

        verify(sesion1, never()).sendMessage(any(TextMessage.class));
    }

    @Test
    @DisplayName("afterConnectionClosed: elimina la sesion del mapa interno")
    void cerrarConexion_eliminaSesion() throws Exception {
        atributos1.put(JwtHandshakeInterceptor.ATTR_USUARIO_ID, "u-1");

        when(sesion1.isOpen()).thenReturn(true);
        handler.afterConnectionEstablished(sesion1);
        handler.afterConnectionClosed(sesion1, CloseStatus.NORMAL);

        Servidor servidor = new Servidor();
        servidor.setUsuarioId("u-1");
        when(servidorService.obtenerPorId("srv-1")).thenReturn(servidor);

        MetricaServidor metrica = new MetricaServidor();
        metrica.setServidorId("srv-1");

        handler.difundirMetrica(metrica);
        verify(sesion1, never()).sendMessage(any(TextMessage.class));
    }

    @Test
    @DisplayName("afterConnectionEstablished: cierra la sesion si no tiene usuarioId en atributos")
    void establecer_sinUsuarioId_cierra() throws Exception {
        // atributos1 vacio: simula sesion que llego sin pasar el interceptor
        handler.afterConnectionEstablished(sesion1);

        verify(sesion1).close(CloseStatus.POLICY_VIOLATION);
    }
}
