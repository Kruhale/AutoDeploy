package com.autodeploy.service;

import com.autodeploy.model.Redireccion;
import com.autodeploy.model.Servidor;
import com.autodeploy.repository.RedireccionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NetworkingServiceTest {

    @Mock
    private RedireccionRepository redireccionRepository;
    @Mock
    private ServidorService servidorService;
    @Mock
    private SshCommandService sshCommandService;

    @InjectMocks
    private NetworkingService networkingService;

    private Servidor servidor;

    @BeforeEach
    void setUp() {
        servidor = new Servidor();
        servidor.setId("srv-1");
    }

    @Test
    @DisplayName("consultarDns: devuelve mapa con las 6 claves (a, aaaa, cname, mx, ns, txt)")
    void consultarDns_devuelveMapaCompleto() {
        Map<String, List<String>> resultado = networkingService.consultarDns("ejemplo.invalido");

        assertThat(resultado).containsOnlyKeys("a", "aaaa", "cname", "mx", "ns", "txt");
        // No fallar si DNS no resuelve un dominio invalido: devuelve listas vacias
        assertThat(resultado.values()).allMatch(lista -> lista != null);
    }

    @Test
    @DisplayName("listarRedirecciones: delega al repositorio")
    void listarRedirecciones_delega() {
        Redireccion r = new Redireccion("srv-1", "old.com", "https://new.com", 301);
        when(redireccionRepository.findByServidorId("srv-1")).thenReturn(List.of(r));

        assertThat(networkingService.listarRedirecciones("srv-1")).hasSize(1);
    }

    @Test
    @DisplayName("crearRedireccion: persiste y sincroniza la config nginx en el VPS")
    void crearRedireccion_persisteYSincroniza() {
        when(servidorService.obtenerPorId("srv-1")).thenReturn(servidor);
        Redireccion creada = new Redireccion("srv-1", "old.com", "https://new.com", 301);
        creada.setId("red-1");
        when(redireccionRepository.save(any(Redireccion.class))).thenReturn(creada);
        when(redireccionRepository.findByServidorId("srv-1")).thenReturn(List.of(creada));

        Redireccion resultado = networkingService.crearRedireccion("srv-1", "old.com", "https://new.com", 301);

        assertThat(resultado.getId()).isEqualTo("red-1");
        verify(sshCommandService).ejecutarComando(eq(servidor), contains("REDIRECTSEOF"));
    }

    @Test
    @DisplayName("eliminarRedireccion: borra y re-sincroniza la config nginx")
    void eliminarRedireccion_borraYSincroniza() {
        Redireccion redir = new Redireccion("srv-1", "old.com", "https://new.com", 301);
        redir.setId("red-1");
        when(redireccionRepository.findById("red-1")).thenReturn(Optional.of(redir));
        when(servidorService.obtenerPorId("srv-1")).thenReturn(servidor);
        when(redireccionRepository.findByServidorId("srv-1")).thenReturn(List.of());

        networkingService.eliminarRedireccion("red-1");

        verify(redireccionRepository).delete(redir);
        verify(sshCommandService).ejecutarComando(eq(servidor), contains("REDIRECTSEOF"));
    }

    @Test
    @DisplayName("eliminarRedireccion: lanza RuntimeException si no existe")
    void eliminarRedireccion_lanzaSiNoExiste() {
        when(redireccionRepository.findById("red-x")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> networkingService.eliminarRedireccion("red-x"))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    @DisplayName("leerConfigRedirects: devuelve la salida del cat por SSH")
    void leerConfigRedirects_devuelveSalida() {
        when(servidorService.obtenerPorId("srv-1")).thenReturn(servidor);
        when(sshCommandService.ejecutarComando(eq(servidor), contains("cat "))).thenReturn("# redirect config");

        assertThat(networkingService.leerConfigRedirects("srv-1")).isEqualTo("# redirect config");
    }

    @Test
    @DisplayName("leerConfigRedirects: devuelve fallback si el SSH falla")
    void leerConfigRedirects_fallback() {
        when(servidorService.obtenerPorId("srv-1")).thenReturn(servidor);
        when(sshCommandService.ejecutarComando(any(), any())).thenThrow(new RuntimeException("SSH fail"));

        assertThat(networkingService.leerConfigRedirects("srv-1")).contains("error");
    }
}
