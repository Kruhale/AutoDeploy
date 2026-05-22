package com.autodeploy.service;

import com.autodeploy.model.MetricaServidor;
import com.autodeploy.model.Servidor;
import com.autodeploy.repository.MetricaServidorRepository;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MonitorMetricasServiceTest {

    @Mock
    private ServidorRepository servidorRepository;
    @Mock
    private MetricaServidorRepository metricaServidorRepository;
    @Mock
    private GestorSesionesSshService gestorSesionesSshService;
    @Mock
    private MetricasWebSocketHandler metricasWebSocketHandler;
    @Mock
    private ReconexionService reconexionService;

    @InjectMocks
    private MonitorMetricasService servicio;

    private Servidor servidor;

    @BeforeEach
    void setUp() {
        servidor = new Servidor();
        servidor.setId("srv-1");
        servidor.setNombre("VPS prod");
        servidor.setDireccionIp("1.2.3.4");
    }

    @Test
    @DisplayName("recolectarMetricasDeTodos: no toca nada si no hay servidores")
    void recolectarMetricasDeTodos_sinServidores() {
        when(servidorRepository.findAll()).thenReturn(List.of());

        servicio.recolectarMetricasDeTodos();

        verify(gestorSesionesSshService, never()).ejecutar(any(), any());
    }

    @Test
    @DisplayName("recolectarMetricasDeTodos: recorre todos los servidores")
    void recolectarMetricasDeTodos_iteraServidores() {
        Servidor s2 = new Servidor();
        s2.setId("srv-2");
        s2.setNombre("VPS staging");

        when(servidorRepository.findAll()).thenReturn(List.of(servidor, s2));
        when(gestorSesionesSshService.ejecutar(any(), any())).thenThrow(new RuntimeException("ssh fail"));
        when(metricaServidorRepository.save(any(MetricaServidor.class))).thenAnswer(inv -> inv.getArgument(0));

        servicio.recolectarMetricasDeTodos();

        verify(metricaServidorRepository, org.mockito.Mockito.times(2)).save(any(MetricaServidor.class));
        verify(metricasWebSocketHandler, org.mockito.Mockito.times(2)).difundirMetrica(any(MetricaServidor.class));
    }

    @Test
    @DisplayName("recolectarParaServidor: marca sesionActiva=false y anota fallo si SSH falla")
    void recolectarParaServidor_marcaInactivoSiFalla() {
        when(gestorSesionesSshService.ejecutar(any(), any())).thenThrow(new RuntimeException("ssh kaboom"));
        when(metricaServidorRepository.save(any(MetricaServidor.class))).thenAnswer(inv -> inv.getArgument(0));

        MetricaServidor resultado = servicio.recolectarParaServidor(servidor);

        assertThat(resultado.isSesionActiva()).isFalse();
        verify(reconexionService).anotarPing(servidor, false);
    }

    @Test
    @DisplayName("recolectarParaServidor: parsea correctamente la salida con todos los bloques")
    void recolectarParaServidor_parseaSalidaCompleta() {
        String salida = String.join("\n",
                "===CPU===",
                "42.5",
                "===RAM===",
                "1024 4096",
                "===DISCO===",
                "10G 50G 20",
                "===CARGA===",
                "0.85",
                "===UPTIME===",
                "86400",
                "===NGINX===",
                "ejemplo.com",
                "api.ejemplo.com",
                "===DOCKER===",
                "nginx",
                "mongo",
                "===FIN==="
        );

        when(gestorSesionesSshService.ejecutar(any(), any())).thenReturn(salida);
        when(metricaServidorRepository.save(any(MetricaServidor.class))).thenAnswer(inv -> inv.getArgument(0));

        ArgumentCaptor<MetricaServidor> captor = ArgumentCaptor.forClass(MetricaServidor.class);

        servicio.recolectarParaServidor(servidor);
        verify(metricaServidorRepository).save(captor.capture());

        MetricaServidor m = captor.getValue();
        assertThat(m.isSesionActiva()).isTrue();
        assertThat(m.getCpuPorcentaje()).isEqualTo(42.5);
        assertThat(m.getRamUsadaMb()).isEqualTo(1024L);
        assertThat(m.getRamTotalMb()).isEqualTo(4096L);
        assertThat(m.getDiscoUsadoGb()).isEqualTo(10L);
        assertThat(m.getDiscoTotalGb()).isEqualTo(50L);
        assertThat(m.getDiscoUsadoPorcentaje()).isEqualTo(20);
        assertThat(m.getCargaPromedio()).isEqualTo(0.85);
        assertThat(m.getTiempoEncendidoSegundos()).isEqualTo(86400L);
        assertThat(m.getWebDesplegadas()).contains("ejemplo.com", "api.ejemplo.com");
        assertThat(m.getContainersDocker()).contains("nginx", "mongo");
    }

    @Test
    @DisplayName("recolectarParaServidor: tolera bloques vacios / valores no parseables sin lanzar")
    void recolectarParaServidor_toleraValoresInvalidos() {
        String salida = "===CPU===\nno-es-numero\n===RAM===\n\n===DISCO===\n\n===CARGA===\nNaN\n===UPTIME===\nblabla\n===NGINX===\n\n===DOCKER===\n\n===FIN===";
        when(gestorSesionesSshService.ejecutar(any(), any())).thenReturn(salida);
        when(metricaServidorRepository.save(any(MetricaServidor.class))).thenAnswer(inv -> inv.getArgument(0));

        MetricaServidor resultado = servicio.recolectarParaServidor(servidor);

        assertThat(resultado.getCpuPorcentaje()).isEqualTo(0.0);
        assertThat(resultado.getRamUsadaMb()).isEqualTo(0L);
        assertThat(resultado.getTiempoEncendidoSegundos()).isEqualTo(0L);
    }

    @Test
    @DisplayName("recolectarParaServidor: parsea unidades T y M en disco")
    void recolectarParaServidor_parseaUnidadesDisco() {
        String salida = "===CPU===\n5\n===RAM===\n100 200\n===DISCO===\n2T 1T 30\n===CARGA===\n0\n===UPTIME===\n10\n===NGINX===\n\n===DOCKER===\n\n===FIN===";
        when(gestorSesionesSshService.ejecutar(any(), any())).thenReturn(salida);
        when(metricaServidorRepository.save(any(MetricaServidor.class))).thenAnswer(inv -> inv.getArgument(0));

        ArgumentCaptor<MetricaServidor> captor = ArgumentCaptor.forClass(MetricaServidor.class);

        servicio.recolectarParaServidor(servidor);
        verify(metricaServidorRepository).save(captor.capture());

        // 2T = 2048 GB, 1T = 1024 GB
        assertThat(captor.getValue().getDiscoUsadoGb()).isEqualTo(2048L);
        assertThat(captor.getValue().getDiscoTotalGb()).isEqualTo(1024L);
    }
}
