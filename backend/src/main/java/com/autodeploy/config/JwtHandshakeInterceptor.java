package com.autodeploy.config;

import com.autodeploy.util.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.net.URI;
import java.util.Map;

/**
 * Comprueba el JWT que viene en la URL del WebSocket (?token=...) antes de aceptar la conexion.
 * Si esta bien, guarda el usuarioId y el rol para usarlos luego en el handler.
 */
@Component
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    public static final String ATTR_USUARIO_ID = "usuarioId";
    public static final String ATTR_ROL = "rol";

    private static final Logger LOGGER = LoggerFactory.getLogger(JwtHandshakeInterceptor.class);

    private final JwtUtil jwtUtil;

    public JwtHandshakeInterceptor(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    public boolean beforeHandshake(ServerHttpRequest peticion,
                                   ServerHttpResponse respuesta,
                                   WebSocketHandler handler,
                                   Map<String, Object> attributes) {
        URI uri = peticion.getURI();
        String consulta = uri.getQuery();
        String tokenJwt = extraerToken(consulta);

        // De momento dejamos pasar el handshake aunque no haya token (solo loggeamos warning).
        // Cuando el frontend mande siempre el token, cambiar el "return true" por "return false".
        if (tokenJwt == null || tokenJwt.isBlank()) {
            LOGGER.warn("Handshake WS sin token en query param ({}) — proximamente sera obligatorio", uri.getPath());
            return true;
        }

        if (!jwtUtil.esValido(tokenJwt)) {
            LOGGER.warn("Handshake WS con token JWT invalido ({}) — proximamente sera rechazado", uri.getPath());
            return true;
        }

        String usuarioId = jwtUtil.extraerUsuarioId(tokenJwt);
        String rol = jwtUtil.extraerRol(tokenJwt);
        attributes.put(ATTR_USUARIO_ID, usuarioId);
        attributes.put(ATTR_ROL, rol);
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest peticion,
                               ServerHttpResponse respuesta,
                               WebSocketHandler handler,
                               Exception excepcion) {
        if (excepcion != null) {
            LOGGER.error("Error tras handshake WS", excepcion);
        }
    }

    private static String extraerToken(String consulta) {
        if (consulta == null || consulta.isBlank()) {
            return null;
        }
        String[] partes = consulta.split("&");
        for (String parte : partes) {
            if (parte.startsWith("token=")) {
                return parte.substring("token=".length());
            }
        }
        return null;
    }
}
