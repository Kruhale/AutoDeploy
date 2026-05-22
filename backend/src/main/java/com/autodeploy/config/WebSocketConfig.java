package com.autodeploy.config;

import com.autodeploy.service.MetricasWebSocketHandler;
import com.autodeploy.service.NotificacionesWebSocketHandler;
import com.autodeploy.service.SshWebSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private static final String[] ORIGENES_PERMITIDOS = {
        "https://autodeploy.kruhale.com",
        "http://localhost:4200",
        "http://localhost:8082"
    };

    private final SshWebSocketHandler sshWebSocketHandler;
    private final MetricasWebSocketHandler metricasWebSocketHandler;
    private final NotificacionesWebSocketHandler notificacionesWebSocketHandler;
    private final JwtHandshakeInterceptor jwtHandshakeInterceptor;

    public WebSocketConfig(SshWebSocketHandler sshWebSocketHandler,
                           MetricasWebSocketHandler metricasWebSocketHandler,
                           NotificacionesWebSocketHandler notificacionesWebSocketHandler,
                           JwtHandshakeInterceptor jwtHandshakeInterceptor) {
        this.sshWebSocketHandler = sshWebSocketHandler;
        this.metricasWebSocketHandler = metricasWebSocketHandler;
        this.notificacionesWebSocketHandler = notificacionesWebSocketHandler;
        this.jwtHandshakeInterceptor = jwtHandshakeInterceptor;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // /ws/terminal abre una sesion SSH al servidor del usuario: requiere
        // autenticacion JWT en el handshake (interceptor rechaza si falta o
        // es invalido) ademas de validacion de ownership en el handler.
        registry.addHandler(sshWebSocketHandler, "/ws/terminal")
                .addInterceptors(jwtHandshakeInterceptor)
                .setAllowedOrigins(ORIGENES_PERMITIDOS);

        // /ws/metricas difunde metricas; requiere JWT para no exponer datos
        // de servidores ajenos.
        registry.addHandler(metricasWebSocketHandler, "/ws/metricas")
                .addInterceptors(jwtHandshakeInterceptor)
                .setAllowedOrigins(ORIGENES_PERMITIDOS);

        // /ws/notificaciones/{usuarioId}: requiere JWT y el handler verifica
        // que el {usuarioId} del path coincide con el del token.
        registry.addHandler(notificacionesWebSocketHandler, "/ws/notificaciones/*")
                .addInterceptors(jwtHandshakeInterceptor)
                .setAllowedOrigins(ORIGENES_PERMITIDOS);
    }
}
