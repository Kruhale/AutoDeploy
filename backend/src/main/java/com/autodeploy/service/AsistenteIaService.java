package com.autodeploy.service;

import com.autodeploy.dto.MensajeChatRequest;
import com.autodeploy.dto.MensajeUsuario;
import com.autodeploy.dto.RespuestaChatIa;
import com.autodeploy.exception.BadRequestException;
import com.autodeploy.exception.ResourceNotFoundException;
import com.autodeploy.model.ConfiguracionAsistenteIa;
import com.autodeploy.model.Servidor;
import com.autodeploy.model.Usuario;
import com.autodeploy.repository.UsuarioRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AsistenteIaService {

    private static final String PROMPT_SISTEMA = """
            Eres un asistente experto en administracion de servidores Linux integrado en una plataforma de despliegues llamada AutoDeploy.
            Tu trabajo es ayudar al usuario a gestionar su servidor remoto mediante comandos SSH.

            REGLAS OBLIGATORIAS:
            1. Responde SIEMPRE en JSON valido con esta estructura exacta:
            {
              "respuesta": "texto natural dirigido al usuario explicando lo que vas a hacer o respondiendo a su pregunta",
              "comandoPropuesto": "comando shell concreto a ejecutar, vacio si no quieres ejecutar nada",
              "razonamiento": "explicacion breve de por que ese comando resuelve la peticion, vacio si no propones comando"
            }
            2. Cuando el usuario pida hacer algo en el servidor, propon un unico comando shell ejecutable.
            3. Si el usuario solo charla o pregunta algo informativo, deja "comandoPropuesto" vacio.
            4. NUNCA propongas comandos destructivos sin avisar claramente en la respuesta.
            5. Habla en espanol.
            6. NO uses bloques de codigo markdown, devuelve SOLO el JSON.
            """;

    private final ConfiguracionAsistenteService configuracionService;
    private final OpenRouterClient openRouterClient;
    private final ServidorService servidorService;
    private final SshCommandService sshCommandService;
    private final UsuarioRepository usuarioRepository;
    private final ObjectMapper objectMapper;

    public AsistenteIaService(ConfiguracionAsistenteService configuracionService, OpenRouterClient openRouterClient, ServidorService servidorService, SshCommandService sshCommandService, UsuarioRepository usuarioRepository) {
        this.configuracionService = configuracionService;
        this.openRouterClient = openRouterClient;
        this.servidorService = servidorService;
        this.sshCommandService = sshCommandService;
        this.usuarioRepository = usuarioRepository;
        this.objectMapper = new ObjectMapper();
    }

    public RespuestaChatIa procesarMensaje(MensajeChatRequest peticion) {
        validarPlanDelUsuario(peticion.usuarioId());

        String apiKeyDescifrada = configuracionService.obtenerApiKeyDescifrada(peticion.usuarioId());
        if (apiKeyDescifrada == null) {
            throw new BadRequestException("No has configurado tu API key de OpenRouter. Ve a la configuracion del asistente.");
        }

        ConfiguracionAsistenteIa configuracion = configuracionService.obtenerOCrear(peticion.usuarioId());
        Servidor servidorObjetivo = servidorService.obtenerPorId(peticion.servidorId());

        String contextoServidor = construirContextoServidor(servidorObjetivo);
        String promptCompleto = PROMPT_SISTEMA + "\n\nCONTEXTO DEL SERVIDOR ACTUAL:\n" + contextoServidor;

        List<MensajeUsuario> historialRecibido = peticion.historial();
        String contenidoCrudo = openRouterClient.enviarConversacion(apiKeyDescifrada, configuracion.getModeloPreferido(), promptCompleto, historialRecibido, peticion.mensaje());

        RespuestaChatIa respuestaParseada = parsearRespuestaIa(contenidoCrudo);
        boolean tieneComando = respuestaParseada.comandoPropuesto() != null && !respuestaParseada.comandoPropuesto().isBlank();

        if (!tieneComando) {
            return respuestaParseada;
        }

        boolean estaAutoAprobado = configuracionService.estaAutoAprobado(respuestaParseada.comandoPropuesto(), configuracion.getComandosAutoAprobados());
        if (!estaAutoAprobado) {
            RespuestaChatIa respuestaConConfirmacion = new RespuestaChatIa(respuestaParseada.respuesta(), respuestaParseada.comandoPropuesto(), respuestaParseada.razonamiento(), true, null);
            return respuestaConConfirmacion;
        }

        String salidaComando = sshCommandService.ejecutarComando(servidorObjetivo, respuestaParseada.comandoPropuesto());
        RespuestaChatIa respuestaConSalida = new RespuestaChatIa(respuestaParseada.respuesta(), respuestaParseada.comandoPropuesto(), respuestaParseada.razonamiento(), false, salidaComando);
        return respuestaConSalida;
    }

    public String ejecutarComandoConfirmado(String servidorId, String comando) {
        Servidor servidor = servidorService.obtenerPorId(servidorId);
        String salida = sshCommandService.ejecutarComando(servidor, comando);
        return salida;
    }

    private void validarPlanDelUsuario(String usuarioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));

        String planDelUsuario = usuario.getPlan();
        boolean planValido = "pro".equals(planDelUsuario) || "business".equals(planDelUsuario);

        if (!planValido) {
            throw new BadRequestException("El asistente IA solo esta disponible en planes Pro y Business");
        }
    }

    private String construirContextoServidor(Servidor servidor) {
        String descripcion = "Nombre: " + servidor.getNombre() + "\nIP: " + servidor.getDireccionIp() + "\nPuerto SSH: " + servidor.getPuertoSsh() + "\nUsuario SSH: " + servidor.getUsuarioSsh();
        return descripcion;
    }

    private RespuestaChatIa parsearRespuestaIa(String contenidoCrudo) {
        try {
            String contenidoLimpio = limpiarJsonMarkdown(contenidoCrudo);
            JsonNode arbolJson = objectMapper.readTree(contenidoLimpio);

            String textoRespuesta = arbolJson.path("respuesta").asText("");
            String comandoExtraido = arbolJson.path("comandoPropuesto").asText("");
            String razonamientoExtraido = arbolJson.path("razonamiento").asText("");

            RespuestaChatIa respuesta = new RespuestaChatIa(textoRespuesta, comandoExtraido, razonamientoExtraido, false, null);
            return respuesta;
        } catch (Exception excepcion) {
            RespuestaChatIa respuestaFallback = new RespuestaChatIa(contenidoCrudo, "", "", false, null);
            return respuestaFallback;
        }
    }

    private String limpiarJsonMarkdown(String contenidoCrudo) {
        String contenido = contenidoCrudo.trim();
        if (contenido.startsWith("```json")) {
            contenido = contenido.substring(7);
        } else if (contenido.startsWith("```")) {
            contenido = contenido.substring(3);
        }
        if (contenido.endsWith("```")) {
            contenido = contenido.substring(0, contenido.length() - 3);
        }
        return contenido.trim();
    }
}
