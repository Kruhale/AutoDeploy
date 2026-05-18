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

    private final SshWebSocketHandler sshWebSocketHandler;
    private final MetricasWebSocketHandler metricasWebSocketHandler;
    private final NotificacionesWebSocketHandler notificacionesWebSocketHandler;

    public WebSocketConfig(SshWebSocketHandler sshWebSocketHandler,
                           MetricasWebSocketHandler metricasWebSocketHandler,
                           NotificacionesWebSocketHandler notificacionesWebSocketHandler) {
        this.sshWebSocketHandler = sshWebSocketHandler;
        this.metricasWebSocketHandler = metricasWebSocketHandler;
        this.notificacionesWebSocketHandler = notificacionesWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(sshWebSocketHandler, "/ws/terminal")
                .setAllowedOrigins("*");
        registry.addHandler(metricasWebSocketHandler, "/ws/metricas")
                .setAllowedOrigins("*");
        registry.addHandler(notificacionesWebSocketHandler, "/ws/notificaciones/*")
                .setAllowedOrigins("*");
    }
}
