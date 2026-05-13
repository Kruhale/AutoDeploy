package com.autodeploy.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

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

        return new OpenAPI().info(informacion);
    }
}
