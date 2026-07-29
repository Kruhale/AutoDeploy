package com.autodeploy.service;

import com.autodeploy.dto.MensajeUsuario;
import com.autodeploy.exception.BadRequestException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class OpenRouterClientTest {

    private OpenRouterClient cliente;
    private RestTemplate restTemplate;
    private MockRestServiceServer mockServer;

    @BeforeEach
    void setUp() {
        cliente = new OpenRouterClient();
        restTemplate = (RestTemplate) ReflectionTestUtils.getField(cliente, "restTemplate");
        mockServer = MockRestServiceServer.createServer(restTemplate);
    }

    @Test
    @DisplayName("enviarConversacion: devuelve el contenido del primer choice cuando la respuesta es valida")
    void respuestaValida() {
        String respuesta = "{\"choices\":[{\"message\":{\"content\":\"Hola humano\"}}]}";
        mockServer.expect(requestTo("https://openrouter.ai/api/v1/chat/completions"))
                .andRespond(withSuccess(respuesta, MediaType.APPLICATION_JSON));

        String resultado = cliente.enviarConversacion("sk-xx", "modelo-1", "prompt sistema", List.of(), "Hola");

        assertThat(resultado).isEqualTo("Hola humano");
    }

    @Test
    @DisplayName("enviarConversacion: incluye el historial en la lista de mensajes enviada")
    void incluyeHistorial() {
        String respuesta = "{\"choices\":[{\"message\":{\"content\":\"ok\"}}]}";
        mockServer.expect(requestTo("https://openrouter.ai/api/v1/chat/completions"))
                .andRespond(withSuccess(respuesta, MediaType.APPLICATION_JSON));

        List<MensajeUsuario> historial = List.of(
                new MensajeUsuario("user", "msg-1"),
                new MensajeUsuario("assistant", "respuesta-1")
        );

        String resultado = cliente.enviarConversacion("sk-xx", "modelo", "sistema", historial, "msg-2");

        assertThat(resultado).isEqualTo("ok");
        mockServer.verify();
    }

    @Test
    @DisplayName("enviarConversacion: 401 traduce a 'API key no es valida'")
    void error401() {
        mockServer.expect(requestTo("https://openrouter.ai/api/v1/chat/completions"))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED).body("{\"error\":\"unauthorized\"}"));

        assertThatThrownBy(() -> cliente.enviarConversacion("sk-mala", "m", "p", List.of(), "msg"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("API key");
    }

    @Test
    @DisplayName("enviarConversacion: 402 traduce a 'sin creditos'")
    void error402() {
        mockServer.expect(requestTo("https://openrouter.ai/api/v1/chat/completions"))
                .andRespond(withStatus(HttpStatusCode.valueOf(402)).body("{}"));

        assertThatThrownBy(() -> cliente.enviarConversacion("sk-xx", "m", "p", List.of(), "msg"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("creditos");
    }

    @Test
    @DisplayName("enviarConversacion: 404 traduce a 'modelo no existe'")
    void error404() {
        mockServer.expect(requestTo("https://openrouter.ai/api/v1/chat/completions"))
                .andRespond(withStatus(HttpStatus.NOT_FOUND).body("{}"));

        assertThatThrownBy(() -> cliente.enviarConversacion("sk-xx", "modelo-malo", "p", List.of(), "msg"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("modelo");
    }

    @Test
    @DisplayName("enviarConversacion: 429 traduce a 'demasiadas peticiones'")
    void error429() {
        mockServer.expect(requestTo("https://openrouter.ai/api/v1/chat/completions"))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS).body("{}"));

        assertThatThrownBy(() -> cliente.enviarConversacion("sk-xx", "m", "p", List.of(), "msg"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Demasiadas peticiones");
    }

    @Test
    @DisplayName("enviarConversacion: 4xx desconocido traduce a 'rechazo la peticion (codigo X)'")
    void error4xxGenerico() {
        mockServer.expect(requestTo("https://openrouter.ai/api/v1/chat/completions"))
                .andRespond(withStatus(HttpStatusCode.valueOf(418)).body("{}"));

        assertThatThrownBy(() -> cliente.enviarConversacion("sk-xx", "m", "p", List.of(), "msg"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("418");
    }

    @Test
    @DisplayName("enviarConversacion: 5xx traduce a 'OpenRouter no esta disponible'")
    void error5xx() {
        mockServer.expect(requestTo("https://openrouter.ai/api/v1/chat/completions"))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR).body("{}"));

        assertThatThrownBy(() -> cliente.enviarConversacion("sk-xx", "m", "p", List.of(), "msg"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("no esta disponible");
    }

    @Test
    @DisplayName("enviarConversacion: error de red (ResourceAccessException) traduce a 'sin conexion'")
    void errorRed() {
        mockServer.expect(requestTo("https://openrouter.ai/api/v1/chat/completions"))
                .andRespond(withException(new java.net.UnknownHostException("openrouter.ai")));

        assertThatThrownBy(() -> cliente.enviarConversacion("sk-xx", "m", "p", List.of(), "msg"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("conectar");
    }

    @Test
    @DisplayName("enviarConversacion: respuesta sin choices arroja BadRequest")
    void respuestaSinChoices() {
        mockServer.expect(requestTo("https://openrouter.ai/api/v1/chat/completions"))
                .andRespond(withSuccess("{\"choices\":[]}", MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> cliente.enviarConversacion("sk-xx", "m", "p", List.of(), "msg"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("inesperado");
    }
}
