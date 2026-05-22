package com.autodeploy.controller;

import com.autodeploy.model.ActividadLog;
import com.autodeploy.model.Backup;
import com.autodeploy.model.Notificacion;
import com.autodeploy.model.ReglaFirewall;
import com.autodeploy.model.Redireccion;
import com.autodeploy.model.Servidor;
import com.autodeploy.model.Subdominio;
import com.autodeploy.repository.ActividadLogRepository;
import com.autodeploy.repository.BackupRepository;
import com.autodeploy.repository.NotificacionRepository;
import com.autodeploy.repository.RedireccionRepository;
import com.autodeploy.repository.ReglaFirewallRepository;
import com.autodeploy.repository.ServidorRepository;
import com.autodeploy.repository.SubdominioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class ControllersIntegrationTest {

    private static final String USUARIO = "user-1";
    private static final String OTRO = "user-otro";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ServidorRepository servidorRepository;
    @Autowired
    private BackupRepository backupRepository;
    @Autowired
    private ReglaFirewallRepository reglaFirewallRepository;
    @Autowired
    private RedireccionRepository redireccionRepository;
    @Autowired
    private SubdominioRepository subdominioRepository;
    @Autowired
    private NotificacionRepository notificacionRepository;
    @Autowired
    private ActividadLogRepository actividadLogRepository;

    private Servidor servidorPropio;

    @BeforeEach
    void limpiar() {
        servidorRepository.deleteAll();
        backupRepository.deleteAll();
        reglaFirewallRepository.deleteAll();
        redireccionRepository.deleteAll();
        subdominioRepository.deleteAll();
        notificacionRepository.deleteAll();
        actividadLogRepository.deleteAll();

        servidorPropio = new Servidor();
        servidorPropio.setUsuarioId(USUARIO);
        servidorPropio.setNombre("VPS test");
        servidorPropio.setDireccionIp("127.0.0.1");
        servidorPropio.setPuertoSsh(22);
        servidorPropio.setUsuarioSsh("root");
        servidorPropio.setMetodoAutenticacion("password");
        servidorPropio = servidorRepository.save(servidorPropio);
    }

    // === Estado (publico) ===

    @Test
    @DisplayName("GET /api/estado: 200 sin autenticacion")
    void estado_publico() throws Exception {
        mockMvc.perform(get("/api/estado"))
                .andExpect(status().isOk());
    }

    // === ActividadLog (solo ADMIN) ===

    @Test
    @DisplayName("GET /api/actividad: 403 si no es ADMIN")
    void actividad_403SiNoAdmin() throws Exception {
        mockMvc.perform(get("/api/actividad").with(user(USUARIO).roles("USUARIO")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/actividad: 200 si es ADMIN")
    void actividad_200SiAdmin() throws Exception {
        actividadLogRepository.save(new ActividadLog("info", "X", "fa-x"));
        mockMvc.perform(get("/api/actividad").with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk());
    }

    // === HealthMonitor ===

    @Test
    @DisplayName("GET /api/health: 403 si no es ADMIN")
    void health_403SiNoAdmin() throws Exception {
        mockMvc.perform(get("/api/health").with(user(USUARIO).roles("USUARIO")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/health/{servidorId}: 200 si el servidor es del usuario")
    void health_200SiDelUsuario() throws Exception {
        mockMvc.perform(get("/api/health/" + servidorPropio.getId())
                        .with(user(USUARIO).roles("USUARIO")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/health/{servidorId}: 403 si el servidor es de otro usuario")
    void health_403SiNoDelUsuario() throws Exception {
        mockMvc.perform(get("/api/health/" + servidorPropio.getId())
                        .with(user(OTRO).roles("USUARIO")))
                .andExpect(status().isForbidden());
    }

    // === Despliegue ===

    @Test
    @DisplayName("GET /api/despliegues: 403 si no es ADMIN")
    void despliegues_403SiNoAdmin() throws Exception {
        mockMvc.perform(get("/api/despliegues").with(user(USUARIO).roles("USUARIO")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/despliegues/servidor/{servidorId}: 200 si es del usuario")
    void despliegues_200ServidorDelUsuario() throws Exception {
        mockMvc.perform(get("/api/despliegues/servidor/" + servidorPropio.getId())
                        .with(user(USUARIO).roles("USUARIO")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/despliegues/servidor/{servidorId}: 403 si es de otro usuario")
    void despliegues_403ServidorAjeno() throws Exception {
        mockMvc.perform(get("/api/despliegues/servidor/" + servidorPropio.getId())
                        .with(user(OTRO).roles("USUARIO")))
                .andExpect(status().isForbidden());
    }

    // === Firewall ===

    @Test
    @DisplayName("GET /api/firewall/servidor/{servidorId}: 200 si es del usuario")
    void firewall_200Listar() throws Exception {
        mockMvc.perform(get("/api/firewall/servidor/" + servidorPropio.getId())
                        .with(user(USUARIO).roles("USUARIO")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/firewall/servidor/{servidorId}: 403 si es de otro usuario")
    void firewall_403Listar() throws Exception {
        mockMvc.perform(get("/api/firewall/servidor/" + servidorPropio.getId())
                        .with(user(OTRO).roles("USUARIO")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/firewall/estado/{servidorId}: 200 si es del usuario")
    void firewall_200Estado() throws Exception {
        mockMvc.perform(get("/api/firewall/estado/" + servidorPropio.getId())
                        .with(user(USUARIO).roles("USUARIO")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("DELETE /api/firewall/regla/{id}: borra cuando la regla pertenece al usuario")
    void firewall_borraReglaDelUsuario() throws Exception {
        ReglaFirewall regla = reglaFirewallRepository.save(new ReglaFirewall(servidorPropio.getId(), "22", "TCP", "allow", "0.0.0.0/0", "SSH"));
        mockMvc.perform(delete("/api/firewall/regla/" + regla.getId())
                        .with(user(USUARIO).roles("USUARIO")))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("DELETE /api/firewall/regla/{id}: 403 cuando la regla es de otro usuario")
    void firewall_noBorraReglaAjena() throws Exception {
        ReglaFirewall regla = reglaFirewallRepository.save(new ReglaFirewall(servidorPropio.getId(), "22", "TCP", "allow", "0.0.0.0/0", "SSH"));
        mockMvc.perform(delete("/api/firewall/regla/" + regla.getId())
                        .with(user(OTRO).roles("USUARIO")))
                .andExpect(status().isForbidden());
    }

    // === Networking ===

    @Test
    @DisplayName("GET /api/networking/dns/{dominio}: 200 para cualquier usuario autenticado")
    void networking_dnsAccesible() throws Exception {
        mockMvc.perform(get("/api/networking/dns/ejemplo.invalido")
                        .with(user(USUARIO).roles("USUARIO")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/networking/redirects/{servidorId}: 403 si es de otro usuario")
    void networking_403RedirectsAjeno() throws Exception {
        mockMvc.perform(get("/api/networking/redirects/" + servidorPropio.getId())
                        .with(user(OTRO).roles("USUARIO")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("DELETE /api/networking/redirects/{id}: borra cuando la redireccion pertenece al usuario")
    void networking_borraRedireccionPropia() throws Exception {
        Redireccion r = redireccionRepository.save(new Redireccion(servidorPropio.getId(), "old.com", "https://new.com", 301));
        mockMvc.perform(delete("/api/networking/redirects/" + r.getId())
                        .with(user(USUARIO).roles("USUARIO")))
                .andExpect(status().isNoContent());
    }

    // === Subdominios ===

    @Test
    @DisplayName("GET /api/subdominios/servidor/{servidorId}: 200 si es del usuario")
    void subdominios_listarPropio() throws Exception {
        mockMvc.perform(get("/api/subdominios/servidor/" + servidorPropio.getId())
                        .with(user(USUARIO).roles("USUARIO")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("DELETE /api/subdominios/{id}: borra cuando es del usuario")
    void subdominios_borraPropio() throws Exception {
        Subdominio s = new Subdominio();
        s.setServidorId(servidorPropio.getId());
        s.setNombre("api");
        s.setTipo("A");
        s.setDestino("1.2.3.4");
        s = subdominioRepository.save(s);

        mockMvc.perform(delete("/api/subdominios/" + s.getId())
                        .with(user(USUARIO).roles("USUARIO")))
                .andExpect(status().isNoContent());
    }

    // === Backups ===

    @Test
    @DisplayName("GET /api/backups/servidor/{servidorId}: 200 si es del usuario")
    void backups_listarPropio() throws Exception {
        mockMvc.perform(get("/api/backups/servidor/" + servidorPropio.getId())
                        .with(user(USUARIO).roles("USUARIO")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/backups/auto/{servidorId}: 200 si es del usuario")
    void backups_consultarAuto() throws Exception {
        mockMvc.perform(get("/api/backups/auto/" + servidorPropio.getId())
                        .with(user(USUARIO).roles("USUARIO")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("DELETE /api/backups/{id}: 403 si el backup es de otro usuario")
    void backups_403BorrarAjeno() throws Exception {
        Backup b = backupRepository.save(new Backup(servidorPropio.getId(), "manual"));
        mockMvc.perform(delete("/api/backups/" + b.getId())
                        .with(user(OTRO).roles("USUARIO")))
                .andExpect(status().isForbidden());
    }

    // === Notificaciones ===

    @Test
    @DisplayName("GET /api/notificaciones/usuario/{usuarioId}: 200 si soy yo")
    void notificaciones_yo_200() throws Exception {
        mockMvc.perform(get("/api/notificaciones/usuario/" + USUARIO)
                        .with(user(USUARIO).roles("USUARIO")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/notificaciones/usuario/{usuarioId}: 403 si es otro usuario")
    void notificaciones_otro_403() throws Exception {
        mockMvc.perform(get("/api/notificaciones/usuario/" + USUARIO)
                        .with(user(OTRO).roles("USUARIO")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("DELETE /api/notificaciones/{id}: borra cuando es de mi usuario")
    void notificaciones_borraPropia() throws Exception {
        Notificacion n = notificacionRepository.save(new Notificacion("info", "T", "D", USUARIO));
        mockMvc.perform(delete("/api/notificaciones/" + n.getId())
                        .with(user(USUARIO).roles("USUARIO")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("PUT /api/notificaciones/{id}/marcar-leida: marca correctamente cuando es propia")
    void notificaciones_marcaPropia() throws Exception {
        Notificacion n = notificacionRepository.save(new Notificacion("info", "T", "D", USUARIO));
        mockMvc.perform(put("/api/notificaciones/" + n.getId() + "/marcar-leida")
                        .with(user(USUARIO).roles("USUARIO")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST /api/notificaciones: 403 si no es ADMIN")
    void notificaciones_crear_403SiNoAdmin() throws Exception {
        mockMvc.perform(post("/api/notificaciones")
                        .contentType("application/json")
                        .content("{}")
                        .with(user(USUARIO).roles("USUARIO")))
                .andExpect(status().isForbidden());
    }

    // === Configuracion Asistente IA ===

    @Test
    @DisplayName("GET /api/asistente-ia/configuracion/{usuarioId}: 200 si soy yo")
    void configAsistente_200SiYo() throws Exception {
        mockMvc.perform(get("/api/asistente-ia/configuracion/" + USUARIO)
                        .with(user(USUARIO).roles("USUARIO")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/asistente-ia/configuracion/{usuarioId}: 403 si es otro")
    void configAsistente_403Otro() throws Exception {
        mockMvc.perform(get("/api/asistente-ia/configuracion/" + USUARIO)
                        .with(user(OTRO).roles("USUARIO")))
                .andExpect(status().isForbidden());
    }

    // === Webhook (publico) ===

    @Test
    @DisplayName("POST /api/webhooks/git/{tokenWebhook}: 404 si el token no existe")
    void webhook_tokenInexistente() throws Exception {
        mockMvc.perform(post("/api/webhooks/git/tok-x")
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isNotFound());
    }
}
