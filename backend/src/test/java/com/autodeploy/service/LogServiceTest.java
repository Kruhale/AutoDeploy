package com.autodeploy.service;

import com.autodeploy.exception.BadRequestException;
import com.autodeploy.model.Servidor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LogServiceTest {

    @Mock
    private SshCommandService sshCommandService;

    @InjectMocks
    private LogService logService;

    private Servidor servidor;

    @BeforeEach
    void setUp() {
        servidor = new Servidor();
        servidor.setId("srv-1");
    }

    @Test
    @DisplayName("obtenerUltimasLineas: devuelve las lineas del tail por SSH")
    void obtenerUltimasLineas_devuelveLineas() {
        when(sshCommandService.ejecutarComando(eq(servidor), contains("tail -n 50"))).thenReturn("linea1\nlinea2\nlinea3");

        List<String> resultado = logService.obtenerUltimasLineas(servidor, "/var/log/syslog", 50);

        assertThat(resultado).containsExactly("linea1", "linea2", "linea3");
    }

    @Test
    @DisplayName("obtenerUltimasLineas: rechaza ruta con espacios (inyeccion)")
    void obtenerUltimasLineas_rechazaRutaConEspacios() {
        assertThatThrownBy(() -> logService.obtenerUltimasLineas(servidor, "/var/log; rm -rf", 10))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("no valida");
    }

    @Test
    @DisplayName("obtenerUltimasLineas: rechaza ruta vacia")
    void obtenerUltimasLineas_rechazaRutaVacia() {
        assertThatThrownBy(() -> logService.obtenerUltimasLineas(servidor, "", 10))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("vacia");
    }

    @Test
    @DisplayName("obtenerUltimasLineas: rechaza ruta null")
    void obtenerUltimasLineas_rechazaRutaNull() {
        assertThatThrownBy(() -> logService.obtenerUltimasLineas(servidor, null, 10))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("obtenerUltimasLineas: rechaza numero de lineas <= 0")
    void obtenerUltimasLineas_rechazaLineasNoPositivas() {
        assertThatThrownBy(() -> logService.obtenerUltimasLineas(servidor, "/var/log/syslog", 0))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("entre 1 y 5000");

        assertThatThrownBy(() -> logService.obtenerUltimasLineas(servidor, "/var/log/syslog", -5))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("obtenerUltimasLineas: rechaza numero de lineas > 5000")
    void obtenerUltimasLineas_rechazaDemasiadasLineas() {
        assertThatThrownBy(() -> logService.obtenerUltimasLineas(servidor, "/var/log/syslog", 5001))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("buscarEnLogs: ejecuta grep -F con el patron entrecomillado")
    void buscarEnLogs_ejecutaGrepConPatronSeguro() {
        when(sshCommandService.ejecutarComando(eq(servidor), contains("grep -F 'ERROR' "))).thenReturn("linea-error1\nlinea-error2");

        List<String> resultado = logService.buscarEnLogs(servidor, "/var/log/app.log", "ERROR");

        assertThat(resultado).hasSize(2);
        assertThat(resultado).containsExactly("linea-error1", "linea-error2");
    }

    @Test
    @DisplayName("buscarEnLogs: rechaza patron con shell metacharacters")
    void buscarEnLogs_rechazaPatronConShell() {
        assertThatThrownBy(() -> logService.buscarEnLogs(servidor, "/var/log/app.log", "ERROR; rm -rf /"))
                .isInstanceOf(BadRequestException.class);

        assertThatThrownBy(() -> logService.buscarEnLogs(servidor, "/var/log/app.log", "$(whoami)"))
                .isInstanceOf(BadRequestException.class);

        assertThatThrownBy(() -> logService.buscarEnLogs(servidor, "/var/log/app.log", "a|b"))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("buscarEnLogs: rechaza patron vacio")
    void buscarEnLogs_rechazaPatronVacio() {
        assertThatThrownBy(() -> logService.buscarEnLogs(servidor, "/var/log/app.log", ""))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("buscarEnLogs: rechaza patron demasiado largo (>200 chars)")
    void buscarEnLogs_rechazaPatronLargo() {
        String patronLargo = "a".repeat(201);

        assertThatThrownBy(() -> logService.buscarEnLogs(servidor, "/var/log/app.log", patronLargo))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("demasiado largo");
    }

    @Test
    @DisplayName("buscarEnLogs: acepta patrones con caracteres seguros (letras, numeros, puntos, dos puntos, arroba, slash, guion)")
    void buscarEnLogs_aceptaPatronesSeguros() {
        when(sshCommandService.ejecutarComando(any(), any())).thenReturn("");

        logService.buscarEnLogs(servidor, "/var/log/app.log", "user@host.com");
        logService.buscarEnLogs(servidor, "/var/log/app.log", "2026-05-22");
        logService.buscarEnLogs(servidor, "/var/log/app.log", "HTTP 200");
    }
}
