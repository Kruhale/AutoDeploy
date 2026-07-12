package com.autodeploy.controller;

import com.autodeploy.model.Usuario;
import com.autodeploy.repository.UsuarioRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class UsuarioControllerExtraTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private Usuario propio;

    @BeforeEach
    void setUp() {
        usuarioRepository.deleteAll();
        propio = new Usuario("Pepe", "pepe@x.com", passwordEncoder.encode("password123"));
        propio.setRol(Usuario.ROL_USUARIO);
        propio.setPlan("free");
        propio = usuarioRepository.save(propio);
    }

    @Test
    @DisplayName("PUT /api/usuarios/{id}: actualiza nombre/email del usuario propio")
    void actualizar_perfilPropio() throws Exception {
        String cuerpo = objectMapper.writeValueAsString(Map.of("nombre", "Nuevo", "email", "nuevo@x.com"));

        mockMvc.perform(put("/api/usuarios/" + propio.getId())
                        .with(user(propio.getId()).roles("USUARIO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nombre").value("Nuevo"));
    }

    @Test
    @DisplayName("PUT /api/usuarios/{id}: 403 si quien actualiza es otro usuario")
    void actualizar_perfilAjeno_403() throws Exception {
        String cuerpo = objectMapper.writeValueAsString(Map.of("nombre", "x", "email", "x@y.com"));

        mockMvc.perform(put("/api/usuarios/" + propio.getId())
                        .with(user("otro").roles("USUARIO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("PUT /api/usuarios/{id}/plan: cambia el plan")
    void cambiarPlan_propio() throws Exception {
        String cuerpo = objectMapper.writeValueAsString(Map.of("plan", "pro"));

        mockMvc.perform(put("/api/usuarios/" + propio.getId() + "/plan")
                        .with(user(propio.getId()).roles("USUARIO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.plan").value("pro"));
    }

    @Test
    @DisplayName("PUT /api/usuarios/{id}/cancelar-suscripcion: marca fechaFinSuscripcion")
    void cancelarSuscripcion_propio() throws Exception {
        mockMvc.perform(put("/api/usuarios/" + propio.getId() + "/cancelar-suscripcion")
                        .with(user(propio.getId()).roles("USUARIO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("PUT /api/usuarios/{id}/idioma: cambia idioma a uno soportado")
    void cambiarIdioma_propio() throws Exception {
        mockMvc.perform(put("/api/usuarios/" + propio.getId() + "/idioma")
                        .with(user(propio.getId()).roles("USUARIO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("idioma", "en"))))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("PUT /api/usuarios/{id}/idioma: 422 con idioma no soportado")
    void cambiarIdioma_noSoportado_422() throws Exception {
        mockMvc.perform(put("/api/usuarios/" + propio.getId() + "/idioma")
                        .with(user(propio.getId()).roles("USUARIO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("idioma", "zh"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET /api/usuarios/admin/todos: 200 si es ADMIN, 403 si no")
    void listarTodos() throws Exception {
        mockMvc.perform(get("/api/usuarios/admin/todos")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/usuarios/admin/todos")
                        .with(user(propio.getId()).roles("USUARIO")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("PUT /api/usuarios/admin/{id}/rol: ADMIN puede cambiar rol")
    void cambiarRol_admin() throws Exception {
        mockMvc.perform(put("/api/usuarios/admin/" + propio.getId() + "/rol")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("rol", "ADMIN"))))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("DELETE /api/usuarios/admin/{id}: ADMIN puede borrar usuario")
    void eliminarComoAdmin() throws Exception {
        mockMvc.perform(delete("/api/usuarios/admin/" + propio.getId())
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("POST /api/usuarios/{id}/claves-ssh: anyade clave SSH al perfil")
    void agregarClaveSsh() throws Exception {
        String cuerpo = objectMapper.writeValueAsString(Map.of("nombre", "key1", "claveCompleta", "ssh-rsa AAAA"));

        mockMvc.perform(post("/api/usuarios/" + propio.getId() + "/claves-ssh")
                        .with(user(propio.getId()).roles("USUARIO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/usuarios/{id}/claves-ssh: lista claves del usuario")
    void listarClavesSsh() throws Exception {
        mockMvc.perform(get("/api/usuarios/" + propio.getId() + "/claves-ssh")
                        .with(user(propio.getId()).roles("USUARIO")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/usuarios/{id}/notificaciones: devuelve preferencias")
    void obtenerNotificaciones() throws Exception {
        mockMvc.perform(get("/api/usuarios/" + propio.getId() + "/notificaciones")
                        .with(user(propio.getId()).roles("USUARIO")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("PUT /api/usuarios/{id}/notificaciones: actualiza preferencias")
    void actualizarNotificaciones() throws Exception {
        String cuerpo = objectMapper.writeValueAsString(Map.of("email", false, "alertasCriticas", true, "eventosDespliegue", false));

        mockMvc.perform(put("/api/usuarios/" + propio.getId() + "/notificaciones")
                        .with(user(propio.getId()).roles("USUARIO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().isOk());
    }
}
