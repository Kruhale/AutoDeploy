package com.autodeploy.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String NOMBRE_ESQUEMA_JWT = "bearerAuth";

    @Bean
    public OpenAPI autoDeployOpenAPI() {
        Contact contacto = new Contact()
                .name("AutoDeploy")
                .email("admin@autodeploy.dev");

        Info informacion = new Info()
                .title("AutoDeploy API")
                .description("API REST para gestión y despliegue automático de servidores VPS")
                .version("1.0.0")
                .contact(contacto);

        SecurityScheme esquemaJwt = new SecurityScheme()
                .type(SecurityScheme.Type.HTTP)
                .scheme("bearer")
                .bearerFormat("JWT")
                .description("Pega aqui el token JWT devuelto por POST /api/auth/login");

        Components componentes = new Components()
                .addSecuritySchemes(NOMBRE_ESQUEMA_JWT, esquemaJwt);

        SecurityRequirement requisitoSeguridad = new SecurityRequirement()
                .addList(NOMBRE_ESQUEMA_JWT);

        return new OpenAPI()
                .info(informacion)
                .components(componentes)
                .addSecurityItem(requisitoSeguridad);
    }
}
