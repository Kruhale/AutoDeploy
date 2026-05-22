package com.autodeploy.service;

import com.autodeploy.model.HealthCheck;
import com.autodeploy.model.Servidor;
import com.autodeploy.repository.HealthCheckRepository;
import com.autodeploy.repository.ServidorRepository;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HealthMonitorServiceTest {

    @Mock
    private HealthCheckRepository healthCheckRepository;

    @Mock
    private ServidorRepository servidorRepository;

    @InjectMocks
    private HealthMonitorService servicio;

    private Servidor servidor;

    @BeforeEach
    void setUp() {
        servidor = new Servidor();
        servidor.setId("srv-1");
        servidor.setNombre("Mi VPS");
        servidor.setDireccionIp("127.0.0.1");
        servidor.setPuertoSsh(22);
    }

    @Test
    @DisplayName("obtenerEstado: delega al repositorio buscando la ultima medicion")
    void obtenerEstado_delega() {
        HealthCheck ultima = new HealthCheck("srv-1", "Mi VPS", "online", 12L, "OK");
        when(healthCheckRepository.findTopByServidorIdOrderByFechaComprobacionDesc("srv-1"))
                .thenReturn(Optional.of(ultima));

        Optional<HealthCheck> resultado = servicio.obtenerEstado("srv-1");

        assertThat(resultado).isPresent();
        assertThat(resultado.get().getEstado()).isEqualTo("online");
    }

    @Test
    @DisplayName("obtenerHistorial: delega al repositorio (top 10)")
    void obtenerHistorial_delega() {
        HealthCheck h1 = new HealthCheck("srv-1", "Mi VPS", "online", 10L, "OK");
        when(healthCheckRepository.findTop10ByServidorIdOrderByFechaComprobacionDesc("srv-1"))
                .thenReturn(List.of(h1));

        List<HealthCheck> resultado = servicio.obtenerHistorial("srv-1");

        assertThat(resultado).hasSize(1);
    }

    @Test
    @DisplayName("obtenerEstadoTodosLosServidores: agrupa la ultima medicion de cada servidor")
    void obtenerEstadoTodosLosServidores_agrupa() {
        Servidor s2 = new Servidor();
        s2.setId("srv-2");
        s2.setNombre("Otro VPS");

        when(servidorRepository.findAll()).thenReturn(List.of(servidor, s2));

        HealthCheck hcSrv1 = new HealthCheck("srv-1", "Mi VPS", "online", 5L, "OK");
        when(healthCheckRepository.findTopByServidorIdOrderByFechaComprobacionDesc("srv-1"))
                .thenReturn(Optional.of(hcSrv1));
        when(healthCheckRepository.findTopByServidorIdOrderByFechaComprobacionDesc("srv-2"))
                .thenReturn(Optional.empty());  // srv-2 sin historial -> se filtra

        List<HealthCheck> resultado = servicio.obtenerEstadoTodosLosServidores();

        assertThat(resultado).hasSize(1);
        assertThat(resultado.get(0).getServidorId()).isEqualTo("srv-1");
    }

    @Test
    @DisplayName("ejecutarComprobaciones: persiste un HealthCheck por cada servidor (online u offline)")
    void ejecutarComprobaciones_persisteUnoPorServidor() {
        when(servidorRepository.findAll()).thenReturn(List.of(servidor));

        servicio.ejecutarComprobaciones();

        ArgumentCaptor<HealthCheck> captor = ArgumentCaptor.forClass(HealthCheck.class);
        verify(healthCheckRepository).save(captor.capture());
        // El estado puede ser online u offline segun si el socket de tests responde.
        // Lo que SI sabemos: servidorId y nombre tienen que estar
        assertThat(captor.getValue().getServidorId()).isEqualTo("srv-1");
        assertThat(captor.getValue().getNombreServidor()).isEqualTo("Mi VPS");
    }
}
