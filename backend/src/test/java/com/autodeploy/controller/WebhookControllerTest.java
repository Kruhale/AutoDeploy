package com.autodeploy.controller;

import com.autodeploy.model.Despliegue;
import com.autodeploy.model.Servidor;
import com.autodeploy.repository.DespliegueRepository;
import com.autodeploy.repository.ServidorRepository;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class WebhookControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DespliegueRepository despliegueRepository;

    @Autowired
    private ServidorRepository servidorRepository;

    private Despliegue despliegueConToken;
    private Servidor servidor;

    @BeforeEach
    void setUp() {
        despliegueRepository.deleteAll();
        servidorRepository.deleteAll();

        servidor = new Servidor();
        servidor.setUsuarioId("u-1");
        servidor.setDireccionIp("127.0.0.1");
        servidor.setPuertoSsh(1);  // puerto cerrado para forzar fallo SSH si llega a desplegar
        servidor.setUsuarioSsh("root");
        servidor.setMetodoAutenticacion("password");
        servidor = servidorRepository.save(servidor);

        despliegueConToken = new Despliegue(servidor.getId(), "git", "https://github.com/x/y");
        despliegueConToken.setTokenWebhook("tok-valido");
        despliegueConToken.setRama("main");
        despliegueConToken = despliegueRepository.save(despliegueConToken);
    }

    @Test
    @DisplayName("POST /api/webhooks/git/{token}: 404 si el token no existe")
    void tokenInexistente_devuelve404() throws Exception {
        mockMvc.perform(post("/api/webhooks/git/tok-no-existe")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    @DisplayName("POST /api/webhooks/git/{token}: ignora cuando no llega cabecera de push")
    void sinCabeceraPush_ignorado() throws Exception {
        mockMvc.perform(post("/api/webhooks/git/tok-valido")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.estado").value("ignorado"));
    }

    @Test
    @DisplayName("POST /api/webhooks/git/{token}: con X-GitHub-Event=push pero rama distinta ignora")
    void ramaDistinta_ignorado() throws Exception {
        // El despliegue espera rama 'main', el payload trae 'develop' -> ignora
        mockMvc.perform(post("/api/webhooks/git/tok-valido")
                        .header("X-GitHub-Event", "push")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ref\":\"refs/heads/develop\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.estado").value("ignorado"));
    }

    @Test
    @DisplayName("POST /api/webhooks/git/{token}: GitLab push con campo 'branch' coincidente arranca deploy")
    void gitlabPush_disparaDeploy() throws Exception {
        // El servidor tiene puerto SSH cerrado, asi que el deploy fallara y devolvera 500
        mockMvc.perform(post("/api/webhooks/git/tok-valido")
                        .header("X-Gitlab-Event", "Push Hook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"branch\":\"main\"}"))
                .andExpect(status().is5xxServerError());
    }
}
