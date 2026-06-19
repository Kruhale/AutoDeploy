package com.autodeploy.service;

import com.autodeploy.dto.MensajeUsuario;
import com.autodeploy.exception.BadRequestException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class OpenRouterClient {

    private static final String URL_OPENROUTER = "https://openrouter.ai/api/v1/chat/completions";
    private static final Logger LOGGER = LoggerFactory.getLogger(OpenRouterClient.class);

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public OpenRouterClient() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    public String enviarConversacion(String apiKey, String modelo, String promptSistema, List<MensajeUsuario> historial, String mensajeNuevo) {
        List<Map<String, String>> listaDeMensajes = construirListaMensajes(promptSistema, historial, mensajeNuevo);

        Map<String, Object> cuerpoPeticion = new LinkedHashMap<>();
        cuerpoPeticion.put("model", modelo);
        cuerpoPeticion.put("messages", listaDeMensajes);
        cuerpoPeticion.put("temperature", 0.3);

        HttpHeaders cabeceras = new HttpHeaders();
        cabeceras.setContentType(MediaType.APPLICATION_JSON);
        cabeceras.setBearerAuth(apiKey);
        cabeceras.set("HTTP-Referer", "https://autodeploy.local");
        cabeceras.set("X-Title", "AutoDeploy AI Assistant");

        HttpEntity<Map<String, Object>> peticionHttp = new HttpEntity<>(cuerpoPeticion, cabeceras);

        try {
            String respuestaJson = restTemplate.postForObject(URL_OPENROUTER, peticionHttp, String.class);
            String contenidoMensaje = extraerContenidoMensaje(respuestaJson);
            return contenidoMensaje;
        } catch (HttpClientErrorException errorCliente) {
            String cuerpoErrorRecibido = errorCliente.getResponseBodyAsString();
            HttpStatusCode codigoEstado = errorCliente.getStatusCode();
            LOGGER.warn("OpenRouter respondio {} : {}", codigoEstado, cuerpoErrorRecibido);
            String mensajeUsuario = traducirErrorCliente(codigoEstado.value(), cuerpoErrorRecibido);
            throw new BadRequestException(mensajeUsuario);
        } catch (HttpServerErrorException errorServidor) {
            LOGGER.error("OpenRouter caido o error 5xx: {}", errorServidor.getMessage());
            throw new BadRequestException("OpenRouter no esta disponible ahora mismo. Intentalo en unos minutos.");
        } catch (ResourceAccessException errorConexion) {
            LOGGER.error("Sin conexion con OpenRouter: {}", errorConexion.getMessage());
            throw new BadRequestException("No se ha podido conectar con OpenRouter. Revisa tu conexion.");
        } catch (Exception excepcionInesperada) {
            LOGGER.error("Error inesperado llamando a OpenRouter", excepcionInesperada);
            throw new BadRequestException("Error inesperado al hablar con la IA: " + excepcionInesperada.getMessage());
        }
    }

    private String traducirErrorCliente(int codigoHttp, String cuerpoError) {
        if (codigoHttp == 401) {
            return "Tu API key de OpenRouter no es valida. Revisa los Ajustes.";
        }
        if (codigoHttp == 402) {
            return "No tienes creditos en OpenRouter para este modelo. Recarga o cambia a un modelo gratis.";
        }
        if (codigoHttp == 404) {
            return "El modelo seleccionado no existe en OpenRouter. Elige otro en los Ajustes.";
        }
        if (codigoHttp == 429) {
            return "Demasiadas peticiones. Espera unos segundos antes de volver a probar.";
        }
        String mensajeBackup = "OpenRouter rechazo la peticion (codigo " + codigoHttp + ").";
        return mensajeBackup;
    }

    private List<Map<String, String>> construirListaMensajes(String promptSistema, List<MensajeUsuario> historial, String mensajeNuevo) {
        List<Map<String, String>> listaDeMensajes = new ArrayList<>();

        Map<String, String> mensajeSistema = new LinkedHashMap<>();
        mensajeSistema.put("role", "system");
        mensajeSistema.put("content", promptSistema);
        listaDeMensajes.add(mensajeSistema);

        if (historial != null) {
            for (MensajeUsuario mensajeHistorial : historial) {
                Map<String, String> mensajeFormateado = new LinkedHashMap<>();
                mensajeFormateado.put("role", mensajeHistorial.rol());
                mensajeFormateado.put("content", mensajeHistorial.contenido());
                listaDeMensajes.add(mensajeFormateado);
            }
        }

        Map<String, String> mensajeActual = new LinkedHashMap<>();
        mensajeActual.put("role", "user");
        mensajeActual.put("content", mensajeNuevo);
        listaDeMensajes.add(mensajeActual);

        return listaDeMensajes;
    }

    private String extraerContenidoMensaje(String respuestaJson) throws Exception {
        JsonNode arbolJson = objectMapper.readTree(respuestaJson);
        JsonNode nodoOpciones = arbolJson.path("choices");

        if (!nodoOpciones.isArray() || nodoOpciones.isEmpty()) {
            throw new RuntimeException("Respuesta vacia de OpenRouter");
        }

        JsonNode primeraOpcion = nodoOpciones.get(0);
        JsonNode nodoMensaje = primeraOpcion.path("message");
        String contenido = nodoMensaje.path("content").asText("");
        return contenido;
    }
}
