package com.autodeploy.controller;

import com.autodeploy.dto.LoginRequest;
import com.autodeploy.dto.RegistroRequest;
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
import org.springframework.test.web.servlet.ResultActions;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class UsuarioControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UsuarioRepository usuarioRepository;

    private static final String URL_REGISTRO = "/api/usuarios/registro";
    private static final String URL_LOGIN = "/api/usuarios/login";
    private static final String URL_USUARIO = "/api/usuarios/";

    @BeforeEach
    void limpiarBaseDeDatos() {
        usuarioRepository.deleteAll();
    }

    private String registrarUsuarioYObtenerId(String nombre, String email, String password) throws Exception {
        RegistroRequest peticion = new RegistroRequest(nombre, email, password);
        String cuerpoPeticion = objectMapper.writeValueAsString(peticion);

        ResultActions resultado = mockMvc.perform(post(URL_REGISTRO)
                .contentType(MediaType.APPLICATION_JSON)
                .content(cuerpoPeticion));

        String cuerpoRespuesta = resultado.andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(cuerpoRespuesta).path("data").path("id").asText();
    }

    @Test
    @DisplayName("registro: devuelve 201 con nombre y email cuando el cuerpo es valido")
    void registro_deberiaDevolver201ConNombreYEmail_cuandoCuerpoEsValido() throws Exception {
        RegistroRequest peticion = new RegistroRequest("Ana Garcia", "ana@correo.com", "clave123");
        String cuerpoPeticion = objectMapper.writeValueAsString(peticion);

        mockMvc.perform(post(URL_REGISTRO)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpoPeticion))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.nombre").value("Ana Garcia"))
                .andExpect(jsonPath("$.data.email").value("ana@correo.com"));
    }

    @Test
    @DisplayName("registro: devuelve 422 cuando falta el email")
    void registro_deberiaDevolver422_cuandoFaltaElEmail() throws Exception {
        String cuerpoPeticion = "{\"nombre\":\"Ana Garcia\",\"password\":\"clave123\"}";

        mockMvc.perform(post(URL_REGISTRO)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpoPeticion))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    @DisplayName("login: devuelve 200 con id cuando las credenciales son correctas")
    void login_deberiaDevolver200ConId_cuandoCredencialesSonCorrectas() throws Exception {
        registrarUsuarioYObtenerId("Ana Garcia", "ana@correo.com", "clave123");

        LoginRequest peticion = new LoginRequest("ana@correo.com", "clave123");
        String cuerpoPeticion = objectMapper.writeValueAsString(peticion);

        mockMvc.perform(post(URL_LOGIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpoPeticion))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").isNotEmpty());
    }

    @Test
    @DisplayName("login: devuelve 400 cuando la password es incorrecta")
    void login_deberiaDevolver400_cuandoPasswordEsIncorrecta() throws Exception {
        registrarUsuarioYObtenerId("Ana Garcia", "ana@correo.com", "clave123");

        LoginRequest peticion = new LoginRequest("ana@correo.com", "passwordErronea");
        String cuerpoPeticion = objectMapper.writeValueAsString(peticion);

        mockMvc.perform(post(URL_LOGIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpoPeticion))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("obtener: devuelve 200 con los datos del usuario cuando el id existe")
    void obtener_deberiaDevolver200ConDatosDelUsuario_cuandoIdExiste() throws Exception {
        String idUsuario = registrarUsuarioYObtenerId("Ana Garcia", "ana@correo.com", "clave123");

        mockMvc.perform(get(URL_USUARIO + idUsuario))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(idUsuario))
                .andExpect(jsonPath("$.data.nombre").value("Ana Garcia"));
    }

    @Test
    @DisplayName("obtener: devuelve 404 cuando el id no existe")
    void obtener_deberiaDevolver404_cuandoIdNoExiste() throws Exception {
        mockMvc.perform(get(URL_USUARIO + "id-que-no-existe"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("eliminar: devuelve 204 cuando el usuario existe")
    void eliminar_deberiaDevolver204_cuandoUsuarioExiste() throws Exception {
        String idUsuario = registrarUsuarioYObtenerId("Ana Garcia", "ana@correo.com", "clave123");

        mockMvc.perform(delete(URL_USUARIO + idUsuario))
                .andExpect(status().isNoContent());
    }
}
