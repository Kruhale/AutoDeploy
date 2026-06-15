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

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SslServiceTest {

    @Mock
    private SshCommandService sshCommandService;
    @Mock
    private ServidorRepository servidorRepository;

    @InjectMocks
    private SslService sslService;

    private Servidor servidor;

    @BeforeEach
    void setUp() {
        servidor = new Servidor();
        servidor.setId("srv-1");
    }

    @Test
    @DisplayName("instalarCertbot: ejecuta apt-get install -y certbot via SSH")
    void instalarCertbot_ejecutaApt() {
        when(sshCommandService.ejecutarComando(eq(servidor), contains("apt-get install -y certbot"))).thenReturn("OK install");

        assertThat(sslService.instalarCertbot(servidor)).isEqualTo("OK install");
    }

    @Test
    @DisplayName("generarCertificado: lanza certbot --nginx con dominio y email")
    void generarCertificado_lanzaCertbot() {
        when(sshCommandService.ejecutarComando(eq(servidor), contains("sudo certbot --nginx -d ejemplo.com"))).thenReturn("cert OK");

        String resultado = sslService.generarCertificado(servidor, "ejemplo.com", "admin@ejemplo.com");

        assertThat(resultado).isEqualTo("cert OK");
    }

    @Test
    @DisplayName("renovarCertificados: lanza certbot renew --dry-run")
    void renovarCertificados_lanzaRenew() {
        when(sshCommandService.ejecutarComando(eq(servidor), eq("sudo certbot renew --dry-run"))).thenReturn("renewed");

        assertThat(sslService.renovarCertificados(servidor)).isEqualTo("renewed");
    }

    @Test
    @DisplayName("obtenerEstadoCertificado: lanza certbot certificates --domain DOMINIO")
    void obtenerEstadoCertificado_lanzaCertificates() {
        when(sshCommandService.ejecutarComando(eq(servidor), contains("sudo certbot certificates --domain ejemplo.com"))).thenReturn("VALID");

        assertThat(sslService.obtenerEstadoCertificado(servidor, "ejemplo.com")).isEqualTo("VALID");
    }

    @Test
    @DisplayName("obtenerServidorOLanzarError: devuelve servidor cuando existe")
    void obtenerServidorOLanzarError_devuelve() {
        when(servidorRepository.findById("srv-1")).thenReturn(Optional.of(servidor));

        assertThat(sslService.obtenerServidorOLanzarError("srv-1")).isSameAs(servidor);
    }

    @Test
    @DisplayName("obtenerServidorOLanzarError: lanza 404 cuando no existe")
    void obtenerServidorOLanzarError_lanza404() {
        when(servidorRepository.findById("srv-x")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> sslService.obtenerServidorOLanzarError("srv-x"))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
