package com.autodeploy.service;

import com.autodeploy.model.ActividadLog;
import com.autodeploy.repository.ActividadLogRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ActividadLogServiceTest {

    @Mock
    private ActividadLogRepository actividadLogRepository;

    @InjectMocks
    private ActividadLogService actividadLogService;

    @Test
    @DisplayName("registrar: persiste una nueva actividad con tipo, mensaje e icono")
    void registrar_persisteActividad() {
        actividadLogService.registrar("info", "Servidor conectado", "fa-server");

        ArgumentCaptor<ActividadLog> captor = ArgumentCaptor.forClass(ActividadLog.class);
        verify(actividadLogRepository).save(captor.capture());

        ActividadLog guardada = captor.getValue();
        assertThat(guardada.getTipo()).isEqualTo("info");
        assertThat(guardada.getMensaje()).isEqualTo("Servidor conectado");
        assertThat(guardada.getIcono()).isEqualTo("fa-server");
    }

    @Test
    @DisplayName("obtenerRecientes: devuelve las 20 actividades mas recientes del repositorio")
    void obtenerRecientes_devuelveListaDelRepositorio() {
        ActividadLog a1 = new ActividadLog("info", "Servidor conectado", "fa-server");
        ActividadLog a2 = new ActividadLog("warning", "Backup tardo mas de lo normal", "fa-warning");
        when(actividadLogRepository.findTop20ByOrderByFechaCreacionDesc()).thenReturn(List.of(a1, a2));

        List<ActividadLog> resultado = actividadLogService.obtenerRecientes();

        assertThat(resultado).hasSize(2);
        assertThat(resultado).containsExactly(a1, a2);
    }
}
