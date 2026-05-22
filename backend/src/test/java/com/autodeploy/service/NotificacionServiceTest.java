package com.autodeploy.service;

import com.autodeploy.dto.NotificacionDTO;
import com.autodeploy.model.Notificacion;
import com.autodeploy.repository.NotificacionRepository;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificacionServiceTest {

    @Mock
    private NotificacionRepository notificacionRepository;

    @Mock
    private NotificacionesWebSocketHandler notificacionesWebSocketHandler;

    @InjectMocks
    private NotificacionService notificacionService;

    private Notificacion notificacionExistente;

    @BeforeEach
    void setUp() {
        notificacionExistente = new Notificacion("info", "Titulo", "Descripcion", "usuario-1");
        notificacionExistente.setId("notif-1");
    }

    @Test
    @DisplayName("crearNotificacion: persiste y empuja via WebSocket")
    void crearNotificacion_persisteYNotifica() {
        when(notificacionRepository.save(any(Notificacion.class))).thenReturn(notificacionExistente);

        Notificacion resultado = notificacionService.crearNotificacion("info", "Titulo", "Descripcion", "usuario-1");

        assertThat(resultado.getId()).isEqualTo("notif-1");
        verify(notificacionRepository).save(any(Notificacion.class));
        verify(notificacionesWebSocketHandler).notificarUsuario(eq("usuario-1"), any(NotificacionDTO.class));
    }

    @Test
    @DisplayName("listarPorUsuario: devuelve DTOs con todos los campos de la notificacion")
    void listarPorUsuario_devuelveDTOs() {
        when(notificacionRepository.findByUsuarioIdOrderByFechaCreacionDesc("usuario-1"))
                .thenReturn(List.of(notificacionExistente));

        List<NotificacionDTO> resultado = notificacionService.listarPorUsuario("usuario-1");

        assertThat(resultado).hasSize(1);
        assertThat(resultado.get(0).getId()).isEqualTo("notif-1");
        assertThat(resultado.get(0).getTipo()).isEqualTo("info");
    }

    @Test
    @DisplayName("listarNoLeidas: filtra por usuarioId y leida=false")
    void listarNoLeidas_filtraNoLeidas() {
        when(notificacionRepository.findByUsuarioIdAndLeidaFalseOrderByFechaCreacionDesc("usuario-1"))
                .thenReturn(List.of(notificacionExistente));

        List<NotificacionDTO> resultado = notificacionService.listarNoLeidas("usuario-1");

        assertThat(resultado).hasSize(1);
        assertThat(resultado.get(0).isLeida()).isFalse();
    }

    @Test
    @DisplayName("contarNoLeidas: delega al repositorio")
    void contarNoLeidas_delega() {
        when(notificacionRepository.countByUsuarioIdAndLeidaFalse("usuario-1")).thenReturn(3L);

        assertThat(notificacionService.contarNoLeidas("usuario-1")).isEqualTo(3L);
    }

    @Test
    @DisplayName("marcarComoLeida: persiste el cambio cuando la notificacion existe")
    void marcarComoLeida_persiste() {
        when(notificacionRepository.findById("notif-1")).thenReturn(Optional.of(notificacionExistente));

        notificacionService.marcarComoLeida("notif-1");

        ArgumentCaptor<Notificacion> captor = ArgumentCaptor.forClass(Notificacion.class);
        verify(notificacionRepository).save(captor.capture());
        assertThat(captor.getValue().isLeida()).isTrue();
    }

    @Test
    @DisplayName("marcarComoLeida: no hace nada cuando la notificacion no existe")
    void marcarComoLeida_noHaceNadaSiNoExiste() {
        when(notificacionRepository.findById("notif-x")).thenReturn(Optional.empty());

        notificacionService.marcarComoLeida("notif-x");

        verify(notificacionRepository, never()).save(any(Notificacion.class));
    }

    @Test
    @DisplayName("marcarTodasComoLeidas: marca todas las no leidas y las persiste con saveAll")
    void marcarTodasComoLeidas_persisteTodas() {
        Notificacion n2 = new Notificacion("warning", "T2", "D2", "usuario-1");
        n2.setId("notif-2");
        when(notificacionRepository.findByUsuarioIdAndLeidaFalseOrderByFechaCreacionDesc("usuario-1"))
                .thenReturn(List.of(notificacionExistente, n2));

        notificacionService.marcarTodasComoLeidas("usuario-1");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Notificacion>> captor = ArgumentCaptor.forClass(List.class);
        verify(notificacionRepository).saveAll(captor.capture());
        assertThat(captor.getValue()).allMatch(Notificacion::isLeida);
    }

    @Test
    @DisplayName("eliminarNotificacion: delega al repositorio")
    void eliminarNotificacion_delega() {
        notificacionService.eliminarNotificacion("notif-1");
        verify(notificacionRepository, times(1)).deleteById("notif-1");
    }

    // Helper para usar eq() de Mockito con Strings
    private static <T> T eq(T value) {
        return org.mockito.ArgumentMatchers.eq(value);
    }
}
