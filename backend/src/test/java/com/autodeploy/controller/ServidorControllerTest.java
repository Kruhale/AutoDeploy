package com.autodeploy.controller;

import com.autodeploy.dto.ConexionSshRequest;
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
import org.springframework.test.web.servlet.ResultActions;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
// Cargamos la cadena de filtros para que @PreAuthorize tenga un Authentication
// real (mockeamos un usuario con .with(user(...)) en cada peticion). Asi
// validamos tambien el ownership efectivo del controlador.
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class ServidorControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ServidorRepository servidorRepository;

    private static final String URL_SERVIDORES = "/api/servidores";
    private static final String URL_SERVIDOR = "/api/servidores/";
    private static final String USUARIO_TEST = "usuario-test-1";

    @BeforeEach
    void limpiarBaseDeDatos() {
        servidorRepository.deleteAll();
    }

    private ConexionSshRequest crearPeticionServidorValida() {
        return new ConexionSshRequest(
                "Servidor de prueba",
                "192.168.1.100",
                22,
                "root",
                "password",
                "claveDeAcceso",
                null
        );
    }

    private String registrarServidorYObtenerId() throws Exception {
        ConexionSshRequest peticion = crearPeticionServidorValida();
        String cuerpoPeticion = objectMapper.writeValueAsString(peticion);

        ResultActions resultado = mockMvc.perform(post(URL_SERVIDORES)
                .with(user(USUARIO_TEST).roles("USUARIO"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(cuerpoPeticion));

        String cuerpoRespuesta = resultado.andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(cuerpoRespuesta).path("data").path("id").asText();
    }

    @Test
    @DisplayName("registrar: devuelve 201 cuando el cuerpo es valido")
    void registrar_deberiaDevolver201_cuandoCuerpoEsValido() throws Exception {
        ConexionSshRequest peticion = crearPeticionServidorValida();
        String cuerpoPeticion = objectMapper.writeValueAsString(peticion);

        mockMvc.perform(post(URL_SERVIDORES)
                        .with(user(USUARIO_TEST).roles("USUARIO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpoPeticion))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.nombre").value("Servidor de prueba"))
                .andExpect(jsonPath("$.data.direccionIp").value("192.168.1.100"));
    }

    @Test
    @DisplayName("registrar: devuelve 422 cuando faltan campos requeridos")
    void registrar_deberiaDevolver422_cuandoFaltanCamposRequeridos() throws Exception {
        String cuerpoPeticion = "{\"nombre\":\"Servidor sin IP\"}";

        mockMvc.perform(post(URL_SERVIDORES)
                        .with(user(USUARIO_TEST).roles("USUARIO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpoPeticion))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    @DisplayName("listar: devuelve 200 con la lista de servidores del usuario autenticado")
    void listar_deberiaDevolver200ConListaDeServidores() throws Exception {
        registrarServidorYObtenerId();

        mockMvc.perform(get(URL_SERVIDORES)
                        .with(user(USUARIO_TEST).roles("USUARIO")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].nombre").value("Servidor de prueba"));
    }

    @Test
    @DisplayName("obtener: devuelve 200 con los datos del servidor cuando el id existe y es del usuario")
    void obtener_deberiaDevolver200ConDatosDelServidor_cuandoIdExisteYEsDelUsuario() throws Exception {
        String idServidor = registrarServidorYObtenerId();

        mockMvc.perform(get(URL_SERVIDOR + idServidor)
                        .with(user(USUARIO_TEST).roles("USUARIO")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(idServidor))
                .andExpect(jsonPath("$.data.nombre").value("Servidor de prueba"));
    }

    @Test
    @DisplayName("obtener: devuelve 403 cuando el servidor pertenece a otro usuario")
    void obtener_deberiaDevolver403_cuandoServidorEsDeOtroUsuario() throws Exception {
        String idServidor = registrarServidorYObtenerId();

        mockMvc.perform(get(URL_SERVIDOR + idServidor)
                        .with(user("otro-usuario").roles("USUARIO")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("obtener: devuelve 403 cuando el id no existe (el ownership check no concede acceso)")
    void obtener_deberiaDevolver403_cuandoIdNoExiste() throws Exception {
        mockMvc.perform(get(URL_SERVIDOR + "id-que-no-existe")
                        .with(user(USUARIO_TEST).roles("USUARIO")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("eliminar: devuelve 204 cuando el servidor existe y es del usuario")
    void eliminar_deberiaDevolver204_cuandoServidorExisteYEsDelUsuario() throws Exception {
        String idServidor = registrarServidorYObtenerId();

        mockMvc.perform(delete(URL_SERVIDOR + idServidor)
                        .with(user(USUARIO_TEST).roles("USUARIO")))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("eliminar: devuelve 403 cuando el servidor es de otro usuario")
    void eliminar_deberiaDevolver403_cuandoServidorEsDeOtroUsuario() throws Exception {
        String idServidor = registrarServidorYObtenerId();

        mockMvc.perform(delete(URL_SERVIDOR + idServidor)
                        .with(user("otro-usuario").roles("USUARIO")))
                .andExpect(status().isForbidden());
    }
}
