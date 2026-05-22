package com.autodeploy.service;

import com.autodeploy.exception.ResourceNotFoundException;
import com.autodeploy.model.Servidor;
import com.autodeploy.repository.ServidorRepository;
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
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NginxServiceTest {

    @Mock
    private SshCommandService sshCommandService;
    @Mock
    private ServidorRepository servidorRepository;

    @InjectMocks
    private NginxService nginxService;

    private Servidor servidor;

    @BeforeEach
    void setUp() {
        servidor = new Servidor();
        servidor.setId("srv-1");
    }

    @Test
    @DisplayName("instalarNginx: ejecuta apt-get install nginx via SSH")
    void instalarNginx_ejecutaApt() {
        when(sshCommandService.ejecutarComando(eq(servidor), contains("apt-get install -y nginx"))).thenReturn("OK");

        assertThat(nginxService.instalarNginx(servidor)).isEqualTo("OK");
    }

    @Test
    @DisplayName("generarConfig: produce un bloque server { } con server_name y proxy_pass")
    void generarConfig_produceBloqueServer() {
        String config = nginxService.generarConfig("ejemplo.com", 3000);

        assertThat(config).contains("server_name ejemplo.com;");
        assertThat(config).contains("proxy_pass http://127.0.0.1:3000;");
        assertThat(config).contains("proxy_set_header Host $host;");
    }

    @Test
    @DisplayName("subirConfig: escribe config en sites-available, crea symlink en sites-enabled y recarga nginx")
    void subirConfig_escribeConfigYRecarga() {
        when(sshCommandService.ejecutarComando(any(), any())).thenReturn("OK");

        nginxService.subirConfig(servidor, "ejemplo.com", "server { ... }");

        verify(sshCommandService).ejecutarComando(eq(servidor), contains("sudo tee /etc/nginx/sites-available/ejemplo.com"));
        verify(sshCommandService).ejecutarComando(eq(servidor), contains("ln -sf"));
        verify(sshCommandService).ejecutarComando(eq(servidor), contains("nginx -t"));
    }

    @Test
    @DisplayName("listarVirtualHosts: parsea la salida del ls sites-enabled")
    void listarVirtualHosts_parsea() {
        when(sshCommandService.ejecutarComando(eq(servidor), eq("ls /etc/nginx/sites-enabled/"))).thenReturn("default sitio1 sitio2");

        List<String> resultado = nginxService.listarVirtualHosts(servidor);

        assertThat(resultado).containsExactly("default", "sitio1", "sitio2");
    }

    @Test
    @DisplayName("eliminarVirtualHost: borra symlink + config y recarga nginx")
    void eliminarVirtualHost_borraYRecarga() {
        when(sshCommandService.ejecutarComando(any(), any())).thenReturn("OK");

        nginxService.eliminarVirtualHost(servidor, "ejemplo.com");

        verify(sshCommandService).ejecutarComando(eq(servidor), contains("rm -f /etc/nginx/sites-enabled/ejemplo.com"));
        verify(sshCommandService).ejecutarComando(eq(servidor), contains("rm -f /etc/nginx/sites-available/ejemplo.com"));
        verify(sshCommandService).ejecutarComando(eq(servidor), contains("systemctl reload nginx"));
    }

    @Test
    @DisplayName("obtenerServidorOLanzarError: devuelve el servidor cuando existe")
    void obtenerServidorOLanzarError_devuelve() {
        when(servidorRepository.findById("srv-1")).thenReturn(Optional.of(servidor));

        assertThat(nginxService.obtenerServidorOLanzarError("srv-1")).isSameAs(servidor);
    }

    @Test
    @DisplayName("obtenerServidorOLanzarError: lanza 404 cuando no existe")
    void obtenerServidorOLanzarError_lanza404() {
        when(servidorRepository.findById("srv-x")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> nginxService.obtenerServidorOLanzarError("srv-x"))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
