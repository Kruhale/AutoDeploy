package com.autodeploy.service;

import com.autodeploy.model.ReglaFirewall;
import com.autodeploy.model.Servidor;
import com.autodeploy.repository.ReglaFirewallRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
class FirewallServiceTest {

    @Mock
    private ReglaFirewallRepository reglaFirewallRepository;
    @Mock
    private ServidorService servidorService;
    @Mock
    private SshCommandService sshCommandService;

    @InjectMocks
    private FirewallService firewallService;

    private Servidor servidor;

    @BeforeEach
    void setUp() {
        servidor = new Servidor();
        servidor.setId("srv-1");
    }

    @Test
    @DisplayName("listarPorServidor: delega al repositorio")
    void listarPorServidor_delega() {
        ReglaFirewall regla = new ReglaFirewall("srv-1", "22", "TCP", "allow", "0.0.0.0/0", "SSH");
        when(reglaFirewallRepository.findByServidorId("srv-1")).thenReturn(List.of(regla));

        assertThat(firewallService.listarPorServidor("srv-1")).hasSize(1);
    }

    @Test
    @DisplayName("agregarRegla: ejecuta ufw via SSH y persiste la regla")
    void agregarRegla_ejecutaUfwYPersiste() {
        when(servidorService.obtenerPorId("srv-1")).thenReturn(servidor);
        when(reglaFirewallRepository.save(any(ReglaFirewall.class))).thenAnswer(inv -> inv.getArgument(0));

        ReglaFirewall resultado = firewallService.agregarRegla("srv-1", "80", "TCP", "allow", "0.0.0.0/0", "HTTP");

        verify(sshCommandService).ejecutarComando(eq(servidor), contains("sudo ufw allow 80/tcp"));
        assertThat(resultado.getServidorId()).isEqualTo("srv-1");
        assertThat(resultado.getPuerto()).isEqualTo("80");
    }

    @Test
    @DisplayName("agregarRegla: construye comando con origen especifico cuando no es 0.0.0.0/0")
    void agregarRegla_comandoConOrigenEspecifico() {
        when(servidorService.obtenerPorId("srv-1")).thenReturn(servidor);
        when(reglaFirewallRepository.save(any(ReglaFirewall.class))).thenAnswer(inv -> inv.getArgument(0));

        firewallService.agregarRegla("srv-1", "5432", "TCP", "allow", "10.0.0.0/8", "PostgreSQL");

        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(sshCommandService).ejecutarComando(eq(servidor), captor.capture());
        assertThat(captor.getValue()).isEqualTo("sudo ufw allow from 10.0.0.0/8 to any port 5432 proto tcp");
    }

    @Test
    @DisplayName("agregarRegla: tolera fallo SSH y aun asi persiste la regla")
    void agregarRegla_toleraFalloSsh() {
        when(servidorService.obtenerPorId("srv-1")).thenReturn(servidor);
        when(sshCommandService.ejecutarComando(any(), any())).thenThrow(new RuntimeException("SSH fail"));
        when(reglaFirewallRepository.save(any(ReglaFirewall.class))).thenAnswer(inv -> inv.getArgument(0));

        ReglaFirewall resultado = firewallService.agregarRegla("srv-1", "22", "TCP", "allow", "0.0.0.0/0", "SSH");

        assertThat(resultado).isNotNull();
        verify(reglaFirewallRepository).save(any(ReglaFirewall.class));
    }

    @Test
    @DisplayName("eliminarRegla: ejecuta ufw delete via SSH y borra del repositorio")
    void eliminarRegla_ejecutaDeleteYBorra() {
        ReglaFirewall regla = new ReglaFirewall("srv-1", "80", "TCP", "allow", "0.0.0.0/0", "HTTP");
        regla.setId("regla-1");
        when(reglaFirewallRepository.findById("regla-1")).thenReturn(Optional.of(regla));
        when(servidorService.obtenerPorId("srv-1")).thenReturn(servidor);

        firewallService.eliminarRegla("regla-1");

        verify(sshCommandService).ejecutarComando(eq(servidor), contains("sudo ufw delete allow 80/tcp"));
        verify(reglaFirewallRepository).delete(regla);
    }

    @Test
    @DisplayName("eliminarRegla: lanza RuntimeException si la regla no existe")
    void eliminarRegla_lanzaSiNoExiste() {
        when(reglaFirewallRepository.findById("regla-x")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> firewallService.eliminarRegla("regla-x"))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    @DisplayName("activarFirewall: ejecuta sudo ufw --force enable")
    void activarFirewall_ejecutaEnable() {
        when(servidorService.obtenerPorId("srv-1")).thenReturn(servidor);

        firewallService.activarFirewall("srv-1");

        verify(sshCommandService).ejecutarComando(eq(servidor), eq("sudo ufw --force enable"));
    }

    @Test
    @DisplayName("desactivarFirewall: ejecuta sudo ufw disable")
    void desactivarFirewall_ejecutaDisable() {
        when(servidorService.obtenerPorId("srv-1")).thenReturn(servidor);

        firewallService.desactivarFirewall("srv-1");

        verify(sshCommandService).ejecutarComando(eq(servidor), eq("sudo ufw disable"));
    }

    @Test
    @DisplayName("estado: devuelve la salida del comando ufw status")
    void estado_devuelveSalidaSsh() {
        when(servidorService.obtenerPorId("srv-1")).thenReturn(servidor);
        when(sshCommandService.ejecutarComando(eq(servidor), eq("sudo ufw status"))).thenReturn("Status: active");

        assertThat(firewallService.estado("srv-1")).isEqualTo("Status: active");
    }
}
