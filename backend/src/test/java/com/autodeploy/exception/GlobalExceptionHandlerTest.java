package com.autodeploy.exception;

import com.autodeploy.dto.ErrorResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.http.HttpMethod;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class GlobalExceptionHandlerTest {

    @Autowired
    private MockMvc mockMvc;

    private GlobalExceptionHandler handler;

    @BeforeEach
    void inicializar() {
        handler = new GlobalExceptionHandler();
    }

    @Test
    @DisplayName("handleResourceNotFound: devuelve 404 con codigo RESOURCE_NOT_FOUND")
    void handleResourceNotFound_devuelve404() {
        ResponseEntity<ErrorResponse> respuesta = handler.handleResourceNotFound(
                new ResourceNotFoundException("Servidor 123 no existe"));

        assertThat(respuesta.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(respuesta.getBody()).isNotNull();
        assertThat(respuesta.getBody().error()).isEqualTo("RESOURCE_NOT_FOUND");
        assertThat(respuesta.getBody().message()).isEqualTo("Servidor 123 no existe");
    }

    @Test
    @DisplayName("handleBadRequest: devuelve 400 con codigo BAD_REQUEST")
    void handleBadRequest_devuelve400() {
        ResponseEntity<ErrorResponse> respuesta = handler.handleBadRequest(
                new BadRequestException("Parametro invalido"));

        assertThat(respuesta.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(respuesta.getBody().error()).isEqualTo("BAD_REQUEST");
        assertThat(respuesta.getBody().message()).isEqualTo("Parametro invalido");
    }

    @Test
    @DisplayName("handleAccessDenied: devuelve 403 con codigo ACCESS_DENIED")
    void handleAccessDenied_devuelve403() {
        ResponseEntity<ErrorResponse> respuesta = handler.handleAccessDenied(
                new AccessDeniedException("Sin permisos"));

        assertThat(respuesta.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(respuesta.getBody().error()).isEqualTo("ACCESS_DENIED");
    }

    @Test
    @DisplayName("handleSinCredenciales: devuelve 401 con codigo UNAUTHORIZED")
    void handleSinCredenciales_devuelve401() {
        ResponseEntity<ErrorResponse> respuesta = handler.handleSinCredenciales(
                new AuthenticationCredentialsNotFoundException("Sin credenciales"));

        assertThat(respuesta.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(respuesta.getBody().error()).isEqualTo("UNAUTHORIZED");
    }

    @Test
    @DisplayName("handleGenericError: devuelve 500 con codigo INTERNAL_ERROR para excepciones inesperadas")
    void handleGenericError_devuelve500() {
        ResponseEntity<ErrorResponse> respuesta = handler.handleGenericError(
                new RuntimeException("Algo inesperado"));

        assertThat(respuesta.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(respuesta.getBody().error()).isEqualTo("INTERNAL_ERROR");
        // El mensaje publico no expone el detalle interno
        assertThat(respuesta.getBody().message()).isEqualTo("Error interno del servidor");
    }

    @Test
    @DisplayName("handleNoResourceFound: devuelve 404 con codigo ROUTE_NOT_FOUND")
    void handleNoResourceFound_devuelve404() {
        ResponseEntity<ErrorResponse> respuesta = handler.handleNoResourceFound(
                new NoResourceFoundException(HttpMethod.GET, "/api/no-existe"));

        assertThat(respuesta.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(respuesta.getBody().error()).isEqualTo("ROUTE_NOT_FOUND");
        assertThat(respuesta.getBody().message()).contains("Ruta no encontrada");
    }

    @Test
    @DisplayName("handleValidationError: devuelve 422 con el primer mensaje del binding")
    void handleValidationError_devuelve422() throws Exception {
        BindingResult bindingResult = new BeanPropertyBindingResult(new Object(), "objeto");
        bindingResult.reject("invalid", "El campo es obligatorio");

        java.lang.reflect.Method metodoFalso = String.class.getMethod("trim");
        org.springframework.core.MethodParameter param = new org.springframework.core.MethodParameter(metodoFalso, -1);

        MethodArgumentNotValidException excepcion = new MethodArgumentNotValidException(param, bindingResult);

        ResponseEntity<ErrorResponse> respuesta = handler.handleValidationError(excepcion);

        assertThat(respuesta.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(respuesta.getBody().error()).isEqualTo("VALIDATION_ERROR");
        assertThat(respuesta.getBody().message()).isEqualTo("El campo es obligatorio");
    }

    @Test
    @DisplayName("integracion: peticion a endpoint inexistente devuelve 404 con ROUTE_NOT_FOUND")
    void integracion_endpointInexistente_devuelve404() throws Exception {
        mockMvc.perform(get("/api/no-existe-ruta")
                        .with(user("u").roles("USUARIO")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("ROUTE_NOT_FOUND"));
    }

    @Test
    @DisplayName("integracion: peticion sin auth a endpoint protegido devuelve 401/403")
    void integracion_sinAuth_devuelve401o403() throws Exception {
        // Sin credenciales -> 401 o 403 segun configuracion de Spring Security
        mockMvc.perform(get("/api/servidores"))
                .andExpect(result -> {
                    int sc = result.getResponse().getStatus();
                    if (sc != 401 && sc != 403) {
                        throw new AssertionError("Esperado 401 o 403, recibido " + sc);
                    }
                });
    }
}
