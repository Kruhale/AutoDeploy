package com.autodeploy.dto;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests "smoke" para los DTOs (records y clases simples).
 * Verifican que los accessors devuelven los valores que se les pasan al constructor.
 * Cubren records que de otra manera quedarian sin tocar por ningun test.
 */
class DtosTest {

    @Test
    @DisplayName("ApiResponse: accessors devuelven los valores del constructor")
    void apiResponse_accessors() {
        ApiResponse<String> r = new ApiResponse<>(true, "OK", "datos");
        assertThat(r.success()).isTrue();
        assertThat(r.message()).isEqualTo("OK");
        assertThat(r.data()).isEqualTo("datos");
    }

    @Test
    @DisplayName("ConexionSshRequest: accessors")
    void conexionSshRequest_accessors() {
        ConexionSshRequest r = new ConexionSshRequest("VPS", "1.2.3.4", 22, "root", "password", "pwd", null);
        assertThat(r.nombre()).isEqualTo("VPS");
        assertThat(r.direccionIp()).isEqualTo("1.2.3.4");
        assertThat(r.puertoSsh()).isEqualTo(22);
        assertThat(r.usuarioSsh()).isEqualTo("root");
        assertThat(r.metodoAutenticacion()).isEqualTo("password");
        assertThat(r.password()).isEqualTo("pwd");
        assertThat(r.claveSshPrivada()).isNull();
    }

    @Test
    @DisplayName("ConfiguracionAsistenteRequest: accessors")
    void configuracionAsistenteRequest_accessors() {
        ConfiguracionAsistenteRequest r = new ConfiguracionAsistenteRequest("api-key", "modelo", List.of("ls"));
        assertThat(r.apiKey()).isEqualTo("api-key");
        assertThat(r.modeloPreferido()).isEqualTo("modelo");
        assertThat(r.comandosAutoAprobados()).containsExactly("ls");
    }

    @Test
    @DisplayName("ConfiguracionAsistenteResponse: accessors")
    void configuracionAsistenteResponse_accessors() {
        ConfiguracionAsistenteResponse r = new ConfiguracionAsistenteResponse(true, "modelo-x", List.of("a", "b"));
        assertThat(r.apiKeyConfigurada()).isTrue();
        assertThat(r.modeloPreferido()).isEqualTo("modelo-x");
        assertThat(r.comandosAutoAprobados()).containsExactly("a", "b");
    }

    @Test
    @DisplayName("ConfigurarNginxRequest: accessors")
    void configurarNginxRequest_accessors() {
        ConfigurarNginxRequest r = new ConfigurarNginxRequest("ejemplo.com", 3000);
        assertThat(r.dominio()).isEqualTo("ejemplo.com");
        assertThat(r.puertoProxy()).isEqualTo(3000);
    }

    @Test
    @DisplayName("EjecutarComandoIaRequest: accessors")
    void ejecutarComandoIaRequest_accessors() {
        EjecutarComandoIaRequest r = new EjecutarComandoIaRequest("srv-1", "hostname");
        assertThat(r.servidorId()).isEqualTo("srv-1");
        assertThat(r.comando()).isEqualTo("hostname");
    }

    @Test
    @DisplayName("ErrorResponse: factory of() rellena timestamp y los campos error/message")
    void errorResponse_factoryOf() {
        ErrorResponse r = ErrorResponse.of("CODIGO", "mensaje");
        assertThat(r.error()).isEqualTo("CODIGO");
        assertThat(r.message()).isEqualTo("mensaje");
        assertThat(r.timestamp()).isNotBlank();
    }

    @Test
    @DisplayName("GenerarCertificadoRequest: accessors")
    void generarCertificadoRequest_accessors() {
        GenerarCertificadoRequest r = new GenerarCertificadoRequest("ejemplo.com", "admin@ejemplo.com");
        assertThat(r.dominio()).isEqualTo("ejemplo.com");
        assertThat(r.email()).isEqualTo("admin@ejemplo.com");
    }

    @Test
    @DisplayName("GitDeployRequest: accessors")
    void gitDeployRequest_accessors() {
        GitDeployRequest r = new GitDeployRequest("srv-1", "https://github.com/x/y", "/srv/app", "main", "node");
        assertThat(r.servidorId()).isEqualTo("srv-1");
        assertThat(r.repoUrl()).isEqualTo("https://github.com/x/y");
        assertThat(r.directorio()).isEqualTo("/srv/app");
        assertThat(r.rama()).isEqualTo("main");
        assertThat(r.tecnologia()).isEqualTo("node");
    }

    @Test
    @DisplayName("LoginRequest: accessors")
    void loginRequest_accessors() {
        LoginRequest r = new LoginRequest("u@x.com", "pwd");
        assertThat(r.email()).isEqualTo("u@x.com");
        assertThat(r.password()).isEqualTo("pwd");
    }

    @Test
    @DisplayName("MensajeChatRequest: accessors con historial null y poblado")
    void mensajeChatRequest_accessors() {
        MensajeUsuario m = new MensajeUsuario("user", "hola");
        MensajeChatRequest r = new MensajeChatRequest("u-1", "s-1", "Hola IA", List.of(m));
        assertThat(r.usuarioId()).isEqualTo("u-1");
        assertThat(r.servidorId()).isEqualTo("s-1");
        assertThat(r.mensaje()).isEqualTo("Hola IA");
        assertThat(r.historial()).containsExactly(m);
    }

    @Test
    @DisplayName("MensajeUsuario: accessors")
    void mensajeUsuario_accessors() {
        MensajeUsuario m = new MensajeUsuario("assistant", "Hola tu");
        assertThat(m.rol()).isEqualTo("assistant");
        assertThat(m.contenido()).isEqualTo("Hola tu");
    }

    @Test
    @DisplayName("NuevoDespliegueRequest: accessors")
    void nuevoDespliegueRequest_accessors() {
        NuevoDespliegueRequest r = new NuevoDespliegueRequest("s-1", "git", "https://github.com/x/y");
        assertThat(r.servidorId()).isEqualTo("s-1");
        assertThat(r.tipo()).isEqualTo("git");
        assertThat(r.url()).isEqualTo("https://github.com/x/y");
    }

    @Test
    @DisplayName("RegistrarSubdominioRequest: accessors")
    void registrarSubdominioRequest_accessors() {
        RegistrarSubdominioRequest r = new RegistrarSubdominioRequest("s-1", "api", "A", "1.2.3.4");
        assertThat(r.servidorId()).isEqualTo("s-1");
        assertThat(r.nombre()).isEqualTo("api");
        assertThat(r.tipo()).isEqualTo("A");
        assertThat(r.destino()).isEqualTo("1.2.3.4");
    }

    @Test
    @DisplayName("RegistroRequest: accessors")
    void registroRequest_accessors() {
        RegistroRequest r = new RegistroRequest("Nombre", "u@x.com", "passwordSegura123");
        assertThat(r.nombre()).isEqualTo("Nombre");
        assertThat(r.email()).isEqualTo("u@x.com");
        assertThat(r.password()).isEqualTo("passwordSegura123");
    }

    @Test
    @DisplayName("RespuestaChatIa: accessors")
    void respuestaChatIa_accessors() {
        RespuestaChatIa r = new RespuestaChatIa("respuesta", "ls -la", "razonamiento", true, null);
        assertThat(r.respuesta()).isEqualTo("respuesta");
        assertThat(r.comandoPropuesto()).isEqualTo("ls -la");
        assertThat(r.razonamiento()).isEqualTo("razonamiento");
        assertThat(r.requiereConfirmacion()).isTrue();
        assertThat(r.salidaComandoAutoEjecutado()).isNull();
    }

    @Test
    @DisplayName("LoginResponse: accessors completos")
    void loginResponse_accessors() {
        java.time.LocalDateTime fecha = java.time.LocalDateTime.of(2026, 6, 1, 0, 0);
        LoginResponse r = new LoginResponse("u-1", "Pepe", "p@x.com", "jwt-token", "pro", fecha, "es");
        assertThat(r.id()).isEqualTo("u-1");
        assertThat(r.nombre()).isEqualTo("Pepe");
        assertThat(r.email()).isEqualTo("p@x.com");
        assertThat(r.token()).isEqualTo("jwt-token");
        assertThat(r.plan()).isEqualTo("pro");
        assertThat(r.fechaFinSuscripcion()).isEqualTo(fecha);
        assertThat(r.idioma()).isEqualTo("es");
    }

    @Test
    @DisplayName("NotificacionDTO: getters/setters round-trip")
    void notificacionDTO_settersGetters() {
        java.time.LocalDateTime fecha = java.time.LocalDateTime.of(2026, 5, 1, 12, 0);
        NotificacionDTO dto = new NotificacionDTO("n-1", "info", "Titulo", "Desc", false, fecha);
        assertThat(dto.getId()).isEqualTo("n-1");
        assertThat(dto.getTipo()).isEqualTo("info");
        assertThat(dto.getTitulo()).isEqualTo("Titulo");
        assertThat(dto.getDescripcion()).isEqualTo("Desc");
        assertThat(dto.isLeida()).isFalse();
        assertThat(dto.getFechaCreacion()).isEqualTo(fecha);

        // Setters
        NotificacionDTO vacio = new NotificacionDTO();
        vacio.setId("n-2");
        vacio.setTipo("warning");
        vacio.setTitulo("T");
        vacio.setDescripcion("D");
        vacio.setLeida(true);
        vacio.setFechaCreacion(fecha);
        assertThat(vacio.getId()).isEqualTo("n-2");
        assertThat(vacio.getTipo()).isEqualTo("warning");
        assertThat(vacio.getTitulo()).isEqualTo("T");
        assertThat(vacio.getDescripcion()).isEqualTo("D");
        assertThat(vacio.isLeida()).isTrue();
        assertThat(vacio.getFechaCreacion()).isEqualTo(fecha);
    }
}
