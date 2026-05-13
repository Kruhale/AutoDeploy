package com.autodeploy.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

@Configuration
public class CorsConfig {

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration configuracionCors = new CorsConfiguration();
        configuracionCors.addAllowedOrigin("http://localhost:4200");
        configuracionCors.addAllowedMethod("*");
        configuracionCors.addAllowedHeader("*");
        configuracionCors.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource fuenteDeConfiguracion = new UrlBasedCorsConfigurationSource();
        fuenteDeConfiguracion.registerCorsConfiguration("/api/**", configuracionCors);

        return new CorsFilter(fuenteDeConfiguracion);
    }
}
