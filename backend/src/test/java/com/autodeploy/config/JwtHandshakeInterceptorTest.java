package com.autodeploy.config;

import com.autodeploy.util.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.socket.WebSocketHandler;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtHandshakeInterceptorTest {

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private ServerHttpRequest peticion;

    @Mock
    private ServerHttpResponse respuesta;

    @Mock
    private WebSocketHandler handler;

    private JwtHandshakeInterceptor interceptor;

    @BeforeEach
    void setUp() {
        interceptor = new JwtHandshakeInterceptor(jwtUtil);
    }

    @Test
    @DisplayName("Sin query string: deja pasar pero no setea atributos")
    void sinQuery_dejaPasarSinAtributos() {
        when(peticion.getURI()).thenReturn(URI.create("ws://localhost/ws/terminal"));

        Map<String, Object> atributos = new HashMap<>();
        boolean resultado = interceptor.beforeHandshake(peticion, respuesta, handler, atributos);

        assertThat(resultado).isTrue();
        assertThat(atributos).isEmpty();
    }

    @Test
    @DisplayName("Token JWT invalido en query: deja pasar pero no setea atributos")
    void tokenInvalido_dejaPasarSinAtributos() {
        when(peticion.getURI()).thenReturn(URI.create("ws://localhost/ws/terminal?token=roto"));
        when(jwtUtil.esValido("roto")).thenReturn(false);

        Map<String, Object> atributos = new HashMap<>();
        boolean resultado = interceptor.beforeHandshake(peticion, respuesta, handler, atributos);

        assertThat(resultado).isTrue();
        assertThat(atributos).isEmpty();
    }

    @Test
    @DisplayName("Token JWT valido: pasa el handshake y guarda usuarioId+rol en atributos")
    void tokenValido_guardaAtributos() {
        when(peticion.getURI()).thenReturn(URI.create("ws://localhost/ws/metricas?token=valido&otra=x"));
        when(jwtUtil.esValido("valido")).thenReturn(true);
        when(jwtUtil.extraerUsuarioId("valido")).thenReturn("usuario-7");
        when(jwtUtil.extraerRol("valido")).thenReturn("USUARIO");

        Map<String, Object> atributos = new HashMap<>();
        boolean resultado = interceptor.beforeHandshake(peticion, respuesta, handler, atributos);

        assertThat(resultado).isTrue();
        assertThat(atributos).containsEntry(JwtHandshakeInterceptor.ATTR_USUARIO_ID, "usuario-7");
        assertThat(atributos).containsEntry(JwtHandshakeInterceptor.ATTR_ROL, "USUARIO");
    }

    @Test
    @DisplayName("afterHandshake con excepcion: no lanza")
    void afterHandshake_conExcepcion_noLanza() {
        interceptor.afterHandshake(peticion, respuesta, handler, new RuntimeException("kaboom"));
        // OK si no lanza
    }

    @Test
    @DisplayName("afterHandshake sin excepcion: no lanza")
    void afterHandshake_sinExcepcion_noLanza() {
        interceptor.afterHandshake(peticion, respuesta, handler, null);
    }
}
