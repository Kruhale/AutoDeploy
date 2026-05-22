package com.autodeploy.controller;

import com.autodeploy.model.Backup;
import com.autodeploy.model.Notificacion;
import com.autodeploy.model.Servidor;
import com.autodeploy.model.Usuario;
import com.autodeploy.repository.BackupRepository;
import com.autodeploy.repository.NotificacionRepository;
import com.autodeploy.repository.ServidorRepository;
import com.autodeploy.repository.UsuarioRepository;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class ControllersExtraTest {

    private static final String USUARIO = "u-1";
    private static final String OTRO = "u-2";

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private ServidorRepository servidorRepository;
    @Autowired private BackupRepository backupRepository;
    @Autowired private NotificacionRepository notificacionRepository;
    @Autowired private UsuarioRepository usuarioRepository;

    private Servidor servidorPropio;

    @BeforeEach
    void setUp() {
        servidorRepository.deleteAll();
        backupRepository.deleteAll();
        notificacionRepository.deleteAll();
        usuarioRepository.deleteAll();

        servidorPropio = new Servidor();
        servidorPropio.setUsuarioId(USUARIO);
        servidorPropio.setNombre("VPS");
        servidorPropio.setDireccionIp("127.0.0.1");
        servidorPropio.setPuertoSsh(22);
        servidorPropio.setUsuarioSsh("root");
        servidorPropio.setMetodoAutenticacion("password");
        servidorPropio = servidorRepository.save(servidorPropio);
    }

    // === Backups ===

    @Test
    @DisplayName("PUT /api/backups/auto/{servidorId}: activar backups automaticos cuando es del usuario")
    void activarBackupsAuto() throws Exception {
        String cuerpo = objectMapper.writeValueAsString(Map.of("activado", true, "hora", "04:30"));

        mockMvc.perform(put("/api/backups/auto/" + servidorPropio.getId())
                        .with(user(USUARIO).roles("USUARIO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("PUT /api/backups/auto/{servidorId}: desactivar backups automaticos")
    void desactivarBackupsAuto() throws Exception {
        String cuerpo = objectMapper.writeValueAsString(Map.of("activado", false, "hora", "03:00"));

        mockMvc.perform(put("/api/backups/auto/" + servidorPropio.getId())
                        .with(user(USUARIO).roles("USUARIO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST /api/backups: crea backup manual del servidor del usuario")
    void crearBackup_propio() throws Exception {
        String cuerpo = objectMapper.writeValueAsString(Map.of("servidorId", servidorPropio.getId(), "tipo", "manual"));

        mockMvc.perform(post("/api/backups")
                        .with(user(USUARIO).roles("USUARIO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST /api/backups: 403 si el servidor es de otro usuario")
    void crearBackup_ajeno_403() throws Exception {
        String cuerpo = objectMapper.writeValueAsString(Map.of("servidorId", servidorPropio.getId(), "tipo", "manual"));

        mockMvc.perform(post("/api/backups")
                        .with(user(OTRO).roles("USUARIO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/backups/{id}/restaurar: lanza error porque el backup no tiene archivo (estado preliminar)")
    void restaurar_sinArchivo() throws Exception {
        Backup b = backupRepository.save(new Backup(servidorPropio.getId(), "manual"));

        mockMvc.perform(post("/api/backups/" + b.getId() + "/restaurar")
                        .with(user(USUARIO).roles("USUARIO")))
                .andExpect(status().is5xxServerError());
    }

    // === Firewall: activar/desactivar via body ===

    @Test
    @DisplayName("POST /api/firewall/activar: 200 si el servidor es del usuario")
    void firewall_activar() throws Exception {
        String cuerpo = objectMapper.writeValueAsString(Map.of("servidorId", servidorPropio.getId()));

        mockMvc.perform(post("/api/firewall/activar")
                        .with(user(USUARIO).roles("USUARIO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST /api/firewall/activar: 403 si el servidor es de otro usuario")
    void firewall_activar_ajeno_403() throws Exception {
        String cuerpo = objectMapper.writeValueAsString(Map.of("servidorId", servidorPropio.getId()));

        mockMvc.perform(post("/api/firewall/activar")
                        .with(user(OTRO).roles("USUARIO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/firewall/desactivar: 200 si es propio")
    void firewall_desactivar_propio() throws Exception {
        String cuerpo = objectMapper.writeValueAsString(Map.of("servidorId", servidorPropio.getId()));

        mockMvc.perform(post("/api/firewall/desactivar")
                        .with(user(USUARIO).roles("USUARIO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST /api/firewall/regla: anyade regla en servidor propio")
    void firewall_anyadeRegla() throws Exception {
        String cuerpo = objectMapper.writeValueAsString(Map.of(
                "servidorId", servidorPropio.getId(),
                "puerto", "22",
                "protocolo", "TCP",
                "accion", "allow",
                "origen", "0.0.0.0/0",
                "descripcion", "SSH"
        ));

        mockMvc.perform(post("/api/firewall/regla")
                        .with(user(USUARIO).roles("USUARIO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().isOk());
    }

    // === Notificaciones (resto de endpoints) ===

    @Test
    @DisplayName("PUT /api/notificaciones/usuario/{usuarioId}/marcar-todas-leidas: marca todas como leidas")
    void notificaciones_marcarTodas() throws Exception {
        notificacionRepository.save(new Notificacion("info", "T1", "D1", USUARIO));
        notificacionRepository.save(new Notificacion("warn", "T2", "D2", USUARIO));

        mockMvc.perform(put("/api/notificaciones/usuario/" + USUARIO + "/marcar-todas-leidas")
                        .with(user(USUARIO).roles("USUARIO")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/notificaciones/usuario/{usuarioId}/no-leidas: lista las no leidas")
    void notificaciones_listarNoLeidas() throws Exception {
        notificacionRepository.save(new Notificacion("info", "T1", "D1", USUARIO));

        mockMvc.perform(get("/api/notificaciones/usuario/" + USUARIO + "/no-leidas")
                        .with(user(USUARIO).roles("USUARIO")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/notificaciones/usuario/{usuarioId}/contar-no-leidas: devuelve el numero")
    void notificaciones_contarNoLeidas() throws Exception {
        notificacionRepository.save(new Notificacion("info", "T1", "D1", USUARIO));

        mockMvc.perform(get("/api/notificaciones/usuario/" + USUARIO + "/contar-no-leidas")
                        .with(user(USUARIO).roles("USUARIO")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST /api/notificaciones: 200 cuando lo dispara un ADMIN")
    void notificaciones_crear_admin() throws Exception {
        String cuerpo = objectMapper.writeValueAsString(Map.of(
                "usuarioId", USUARIO,
                "tipo", "info",
                "titulo", "Bienvenido",
                "descripcion", "Hola"
        ));

        mockMvc.perform(post("/api/notificaciones")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().isOk());
    }

    // === ConfiguracionAsistenteIA ===

    @Test
    @DisplayName("PUT /api/asistente-ia/configuracion/{usuarioId}: actualizar config propia")
    void configIa_actualizar() throws Exception {
        String cuerpo = objectMapper.writeValueAsString(Map.of(
                "apiKey", "sk-or-fake",
                "modeloPreferido", "modelo-x",
                "comandosAutoAprobados", java.util.List.of("ls", "df")
        ));

        mockMvc.perform(put("/api/asistente-ia/configuracion/" + USUARIO)
                        .with(user(USUARIO).roles("USUARIO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("PUT /api/asistente-ia/configuracion/{usuarioId}: 403 si es de otro usuario")
    void configIa_actualizar_ajeno_403() throws Exception {
        String cuerpo = objectMapper.writeValueAsString(Map.of("apiKey", "x"));

        mockMvc.perform(put("/api/asistente-ia/configuracion/" + USUARIO)
                        .with(user(OTRO).roles("USUARIO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().isForbidden());
    }

    // === Asistente IA: ejecutar comando ===

    @Test
    @DisplayName("POST /api/asistente-ia/ejecutar: 403 si el servidor no es del usuario")
    void asistenteEjecutar_servidorAjeno_403() throws Exception {
        String cuerpo = objectMapper.writeValueAsString(Map.of(
                "servidorId", servidorPropio.getId(),
                "comando", "uptime"
        ));

        mockMvc.perform(post("/api/asistente-ia/ejecutar")
                        .with(user(OTRO).roles("USUARIO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/asistente-ia/mensaje: 403 si servidorId del body no es del usuario")
    void asistenteMensaje_servidorAjeno_403() throws Exception {
        String cuerpo = objectMapper.writeValueAsString(Map.of(
                "usuarioId", OTRO,
                "servidorId", servidorPropio.getId(),
                "mensaje", "hola"
        ));

        mockMvc.perform(post("/api/asistente-ia/mensaje")
                        .with(user(OTRO).roles("USUARIO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().isForbidden());
    }

    // === Servidores: reboot y probar conexion ===

    @Test
    @DisplayName("POST /api/servidores/probar-conexion: 200 (intenta conexion sin guardar)")
    void servidores_probarConexion() throws Exception {
        String cuerpo = objectMapper.writeValueAsString(Map.of(
                "nombre", "x",
                "direccionIp", "127.0.0.1",
                "puertoSsh", 1,
                "usuarioSsh", "root",
                "metodoAutenticacion", "password",
                "password", "x"
        ));

        mockMvc.perform(post("/api/servidores/probar-conexion")
                        .with(user(USUARIO).roles("USUARIO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/servidores/paginadas: 200 con paginacion")
    void servidores_paginadas() throws Exception {
        mockMvc.perform(get("/api/servidores/paginadas?page=0&size=10")
                        .with(user(USUARIO).roles("USUARIO")))
                .andExpect(status().isOk());
    }
}
