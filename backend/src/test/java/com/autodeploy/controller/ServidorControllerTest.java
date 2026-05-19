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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
// Saltamos la cadena de filtros (JwtAuthenticationFilter) para testear el
// controlador sin tener que generar JWTs reales. Si en un futuro se quiere
// cubrir la integración con seguridad, hacerlo con @WithMockUser o un test
// específico dedicado.
@AutoConfigureMockMvc(addFilters = false)
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
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpoPeticion))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    @DisplayName("listar: devuelve 200 con la lista de servidores")
    void listar_deberiaDevolver200ConListaDeServidores() throws Exception {
        registrarServidorYObtenerId();

        mockMvc.perform(get(URL_SERVIDORES))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].nombre").value("Servidor de prueba"));
    }

    @Test
    @DisplayName("obtener: devuelve 200 con los datos del servidor cuando el id existe")
    void obtener_deberiaDevolver200ConDatosDelServidor_cuandoIdExiste() throws Exception {
        String idServidor = registrarServidorYObtenerId();

        mockMvc.perform(get(URL_SERVIDOR + idServidor))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(idServidor))
                .andExpect(jsonPath("$.data.nombre").value("Servidor de prueba"));
    }

    @Test
    @DisplayName("obtener: devuelve 404 cuando el id no existe")
    void obtener_deberiaDevolver404_cuandoIdNoExiste() throws Exception {
        mockMvc.perform(get(URL_SERVIDOR + "id-que-no-existe"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("eliminar: devuelve 204 cuando el servidor existe")
    void eliminar_deberiaDevolver204_cuandoServidorExiste() throws Exception {
        String idServidor = registrarServidorYObtenerId();

        mockMvc.perform(delete(URL_SERVIDOR + idServidor))
                .andExpect(status().isNoContent());
    }
}
