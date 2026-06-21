package com.autodeploy.service;

import com.autodeploy.dto.MensajeChatRequest;
import com.autodeploy.dto.RespuestaChatIa;
import com.autodeploy.exception.BadRequestException;
import com.autodeploy.exception.ResourceNotFoundException;
import com.autodeploy.model.ConfiguracionAsistenteIa;
import com.autodeploy.model.Servidor;
import com.autodeploy.model.Usuario;
import com.autodeploy.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AsistenteIaServiceTest {

    @Mock private ConfiguracionAsistenteService configuracionService;
    @Mock private OpenRouterClient openRouterClient;
    @Mock private ServidorService servidorService;
    @Mock private SshCommandService sshCommandService;
    @Mock private UsuarioRepository usuarioRepository;

    @InjectMocks
    private AsistenteIaService asistenteIaService;

    private Usuario usuarioPro;
    private Usuario usuarioFree;
    private Servidor servidor;
    private ConfiguracionAsistenteIa configuracion;

    @BeforeEach
    void setUp() {
        usuarioPro = new Usuario("Pepe", "p@x.com", "hash");
        usuarioPro.setId("u-1");
        usuarioPro.setPlan("pro");

        usuarioFree = new Usuario("Free", "f@x.com", "hash");
        usuarioFree.setId("u-2");
        usuarioFree.setPlan("free");

        servidor = new Servidor();
        servidor.setId("srv-1");
        servidor.setNombre("VPS test");
        servidor.setDireccionIp("1.2.3.4");
        servidor.setPuertoSsh(22);
        servidor.setUsuarioSsh("root");

        configuracion = new ConfiguracionAsistenteIa();
        configuracion.setUsuarioId("u-1");
        configuracion.setModeloPreferido("modelo-1");
        configuracion.setComandosAutoAprobados(List.of());
    }

    @Test
    @DisplayName("procesarMensaje: lanza BadRequest si el usuario tiene plan free")
    void procesarMensaje_planFree() {
        when(usuarioRepository.findById("u-2")).thenReturn(Optional.of(usuarioFree));

        assertThatThrownBy(() -> asistenteIaService.procesarMensaje(
                new MensajeChatRequest("u-2", "srv-1", "hola", null), "u-2"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Pro y Business");
    }

    @Test
    @DisplayName("procesarMensaje: lanza 404 si el usuario no existe")
    void procesarMensaje_usuarioNoExiste() {
        when(usuarioRepository.findById("u-x")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> asistenteIaService.procesarMensaje(
                new MensajeChatRequest("u-x", "srv-1", "hola", null), "u-x"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("procesarMensaje: lanza BadRequest si no hay apiKey configurada")
    void procesarMensaje_sinApiKey() {
        when(usuarioRepository.findById("u-1")).thenReturn(Optional.of(usuarioPro));
        when(configuracionService.obtenerApiKeyDescifrada("u-1")).thenReturn(null);

        assertThatThrownBy(() -> asistenteIaService.procesarMensaje(
                new MensajeChatRequest("u-1", "srv-1", "hola", null), "u-1"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("API key");
    }

    @Test
    @DisplayName("procesarMensaje: devuelve respuesta sin comando cuando la IA no propone uno")
    void procesarMensaje_sinComando() {
        when(usuarioRepository.findById("u-1")).thenReturn(Optional.of(usuarioPro));
        when(configuracionService.obtenerApiKeyDescifrada("u-1")).thenReturn("sk-api");
        when(configuracionService.obtenerOCrear("u-1")).thenReturn(configuracion);
        when(servidorService.obtenerPorId("srv-1")).thenReturn(servidor);
        when(openRouterClient.enviarConversacion(any(), any(), any(), any(), any()))
                .thenReturn("{\"respuesta\":\"Hola humano\",\"comandoPropuesto\":\"\",\"razonamiento\":\"\"}");

        RespuestaChatIa resp = asistenteIaService.procesarMensaje(new MensajeChatRequest("u-1", "srv-1", "hola", null), "u-1");

        assertThat(resp.respuesta()).isEqualTo("Hola humano");
        assertThat(resp.comandoPropuesto()).isEmpty();
        assertThat(resp.requiereConfirmacion()).isFalse();
    }

    @Test
    @DisplayName("procesarMensaje: requiere confirmacion cuando la IA propone un comando NO auto-aprobado")
    void procesarMensaje_comandoRequiereConfirmacion() {
        when(usuarioRepository.findById("u-1")).thenReturn(Optional.of(usuarioPro));
        when(configuracionService.obtenerApiKeyDescifrada("u-1")).thenReturn("sk-api");
        when(configuracionService.obtenerOCrear("u-1")).thenReturn(configuracion);
        when(servidorService.obtenerPorId("srv-1")).thenReturn(servidor);
        when(openRouterClient.enviarConversacion(any(), any(), any(), any(), any()))
                .thenReturn("{\"respuesta\":\"Voy a reiniciar nginx\",\"comandoPropuesto\":\"sudo systemctl restart nginx\",\"razonamiento\":\"el usuario lo pidio\"}");
        when(configuracionService.estaAutoAprobado(anyString(), any())).thenReturn(false);

        RespuestaChatIa resp = asistenteIaService.procesarMensaje(new MensajeChatRequest("u-1", "srv-1", "reinicia nginx", null), "u-1");

        assertThat(resp.requiereConfirmacion()).isTrue();
        assertThat(resp.comandoPropuesto()).isEqualTo("sudo systemctl restart nginx");
    }

    @Test
    @DisplayName("procesarMensaje: ejecuta automaticamente cuando el comando esta auto-aprobado")
    void procesarMensaje_comandoAutoAprobado() {
        when(usuarioRepository.findById("u-1")).thenReturn(Optional.of(usuarioPro));
        when(configuracionService.obtenerApiKeyDescifrada("u-1")).thenReturn("sk-api");
        when(configuracionService.obtenerOCrear("u-1")).thenReturn(configuracion);
        when(servidorService.obtenerPorId("srv-1")).thenReturn(servidor);
        when(openRouterClient.enviarConversacion(any(), any(), any(), any(), any()))
                .thenReturn("{\"respuesta\":\"voy a ver el uptime\",\"comandoPropuesto\":\"uptime\",\"razonamiento\":\"trivial\"}");
        when(configuracionService.estaAutoAprobado(anyString(), any())).thenReturn(true);
        when(sshCommandService.ejecutarComando(servidor, "uptime")).thenReturn(" 12:00:01 up 3 days");

        RespuestaChatIa resp = asistenteIaService.procesarMensaje(new MensajeChatRequest("u-1", "srv-1", "uptime", null), "u-1");

        assertThat(resp.requiereConfirmacion()).isFalse();
        assertThat(resp.salidaComandoAutoEjecutado()).contains("up 3 days");
    }

    @Test
    @DisplayName("procesarMensaje: cuando la respuesta no es JSON valido, fallback a texto crudo sin comando")
    void procesarMensaje_respuestaNoJson() {
        when(usuarioRepository.findById("u-1")).thenReturn(Optional.of(usuarioPro));
        when(configuracionService.obtenerApiKeyDescifrada("u-1")).thenReturn("sk-api");
        when(configuracionService.obtenerOCrear("u-1")).thenReturn(configuracion);
        when(servidorService.obtenerPorId("srv-1")).thenReturn(servidor);
        when(openRouterClient.enviarConversacion(any(), any(), any(), any(), any()))
                .thenReturn("texto pelado sin JSON");

        RespuestaChatIa resp = asistenteIaService.procesarMensaje(new MensajeChatRequest("u-1", "srv-1", "?", null), "u-1");

        assertThat(resp.respuesta()).isEqualTo("texto pelado sin JSON");
        assertThat(resp.comandoPropuesto()).isEmpty();
    }

    @Test
    @DisplayName("procesarMensaje: limpia el JSON cuando viene envuelto en ```json ... ```")
    void procesarMensaje_limpiaMarkdown() {
        when(usuarioRepository.findById("u-1")).thenReturn(Optional.of(usuarioPro));
        when(configuracionService.obtenerApiKeyDescifrada("u-1")).thenReturn("sk-api");
        when(configuracionService.obtenerOCrear("u-1")).thenReturn(configuracion);
        when(servidorService.obtenerPorId("srv-1")).thenReturn(servidor);
        when(openRouterClient.enviarConversacion(any(), any(), any(), any(), any()))
                .thenReturn("```json\n{\"respuesta\":\"hola\",\"comandoPropuesto\":\"\",\"razonamiento\":\"\"}\n```");

        RespuestaChatIa resp = asistenteIaService.procesarMensaje(new MensajeChatRequest("u-1", "srv-1", "hola", null), "u-1");

        assertThat(resp.respuesta()).isEqualTo("hola");
    }

    @Test
    @DisplayName("ejecutarComandoConfirmado: envia el comando por SSH y devuelve la salida")
    void ejecutarComandoConfirmado_ejecuta() {
        when(servidorService.obtenerPorId("srv-1")).thenReturn(servidor);
        when(sshCommandService.ejecutarComando(servidor, "ls -la")).thenReturn("total 0");

        String salida = asistenteIaService.ejecutarComandoConfirmado("srv-1", "ls -la");

        assertThat(salida).isEqualTo("total 0");
    }
}
