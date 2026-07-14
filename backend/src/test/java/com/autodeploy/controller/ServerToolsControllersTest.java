package com.autodeploy.controller;

import com.autodeploy.model.Servidor;
import com.autodeploy.repository.ServidorRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests de integracion para los controllers que actuan sobre el servidor remoto
 * (Nginx, Ssl, DeployGit, DeployZip). Los endpoints requieren SSH real al sandbox
 * de pruebas; aqui solo verificamos autorizacion, validacion de propiedad del
 * servidor y forma del response (no la salida exacta del comando remoto, que
 * depende del entorno).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class ServerToolsControllersTest {

    private static final String USUARIO = "u-1";
    private static final String OTRO = "u-2";

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private ServidorRepository servidorRepository;

    private Servidor servidorPropio;

    @BeforeEach
    void setUp() {
        servidorRepository.deleteAll();
        servidorPropio = new Servidor();
        servidorPropio.setUsuarioId(USUARIO);
        servidorPropio.setNombre("VPS");
        servidorPropio.setDireccionIp("127.0.0.1");
        servidorPropio.setPuertoSsh(1);  // puerto cerrado para que SSH falle silenciosamente
        servidorPropio.setUsuarioSsh("root");
        servidorPropio.setMetodoAutenticacion("password");
        servidorPropio = servidorRepository.save(servidorPropio);
    }

    // === NginxController ===

    @Test
    @DisplayName("POST /api/nginx/{servidorId}/instalar: 403 si el servidor es de otro usuario")
    void nginx_instalar_ajeno_403() throws Exception {
        mockMvc.perform(post("/api/nginx/" + servidorPropio.getId() + "/instalar")
                        .with(user(OTRO).roles("USUARIO")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/nginx/{servidorId}/hosts: 403 si el servidor es ajeno")
    void nginx_listarHosts_ajeno_403() throws Exception {
        mockMvc.perform(get("/api/nginx/" + servidorPropio.getId() + "/hosts")
                        .with(user(OTRO).roles("USUARIO")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/nginx/{servidorId}/configurar: pasa el guard de propiedad y devuelve 5xx por fallo SSH (servidor con puerto cerrado)")
    void nginx_configurar_propio() throws Exception {
        String cuerpo = objectMapper.writeValueAsString(Map.of("dominio", "ejemplo.com", "puertoProxy", 3000));

        mockMvc.perform(post("/api/nginx/" + servidorPropio.getId() + "/configurar")
                        .with(user(USUARIO).roles("USUARIO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().is5xxServerError());
    }

    @Test
    @DisplayName("DELETE /api/nginx/{servidorId}/hosts/{dominio}: pasa el guard y falla con 5xx (SSH no disponible en el test)")
    void nginx_eliminarHost_propio() throws Exception {
        mockMvc.perform(delete("/api/nginx/" + servidorPropio.getId() + "/hosts/ejemplo.com")
                        .with(user(USUARIO).roles("USUARIO")))
                .andExpect(status().is5xxServerError());
    }

    // === SslController ===

    @Test
    @DisplayName("POST /api/ssl/{servidorId}/instalar: 403 si es ajeno")
    void ssl_instalar_ajeno_403() throws Exception {
        mockMvc.perform(post("/api/ssl/" + servidorPropio.getId() + "/instalar")
                        .with(user(OTRO).roles("USUARIO")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/ssl/{servidorId}/instalar: pasa el guard y devuelve 5xx por fallo SSH")
    void ssl_instalar_propio() throws Exception {
        mockMvc.perform(post("/api/ssl/" + servidorPropio.getId() + "/instalar")
                        .with(user(USUARIO).roles("USUARIO")))
                .andExpect(status().is5xxServerError());
    }

    @Test
    @DisplayName("POST /api/ssl/{servidorId}/renovar: pasa el guard y devuelve 5xx por fallo SSH")
    void ssl_renovar_propio() throws Exception {
        mockMvc.perform(post("/api/ssl/" + servidorPropio.getId() + "/renovar")
                        .with(user(USUARIO).roles("USUARIO")))
                .andExpect(status().is5xxServerError());
    }

    @Test
    @DisplayName("GET /api/ssl/{servidorId}/estado/{dominio}: pasa el guard y devuelve 5xx por fallo SSH")
    void ssl_estado_propio() throws Exception {
        mockMvc.perform(get("/api/ssl/" + servidorPropio.getId() + "/estado/ejemplo.com")
                        .with(user(USUARIO).roles("USUARIO")))
                .andExpect(status().is5xxServerError());
    }

    @Test
    @DisplayName("POST /api/ssl/{servidorId}/generar: pasa el guard y devuelve 5xx por fallo SSH")
    void ssl_generar_propio() throws Exception {
        String cuerpo = objectMapper.writeValueAsString(Map.of("dominio", "ejemplo.com", "email", "admin@ejemplo.com"));

        mockMvc.perform(post("/api/ssl/" + servidorPropio.getId() + "/generar")
                        .with(user(USUARIO).roles("USUARIO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().is5xxServerError());
    }

    // === DeployGitController ===

    @Test
    @DisplayName("POST /api/deploy/git: 403 si el servidor del body es ajeno")
    void deployGit_servidorAjeno_403() throws Exception {
        String cuerpo = objectMapper.writeValueAsString(Map.of(
                "servidorId", servidorPropio.getId(),
                "repoUrl", "https://github.com/x/y",
                "directorio", "/srv/app",
                "rama", "main",
                "tecnologia", "node"
        ));

        mockMvc.perform(post("/api/deploy/git")
                        .with(user(OTRO).roles("USUARIO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/deploy/git: 422 si faltan campos required (validacion del @Valid)")
    void deployGit_validation_422() throws Exception {
        String cuerpo = "{\"servidorId\":\"" + servidorPropio.getId() + "\"}";

        mockMvc.perform(post("/api/deploy/git")
                        .with(user(USUARIO).roles("USUARIO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    @DisplayName("POST /api/deploy/git: 5xx cuando SSH falla en el servidor inexistente")
    void deployGit_sshFalla_500() throws Exception {
        String cuerpo = objectMapper.writeValueAsString(Map.of(
                "servidorId", servidorPropio.getId(),
                "repoUrl", "https://github.com/x/y",
                "directorio", "/srv/app",
                "rama", "main",
                "tecnologia", "node"
        ));

        mockMvc.perform(post("/api/deploy/git")
                        .with(user(USUARIO).roles("USUARIO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().is5xxServerError());
    }
}
