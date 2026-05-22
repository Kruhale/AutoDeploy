package com.autodeploy.service;

import com.autodeploy.exception.ResourceNotFoundException;
import com.autodeploy.model.Despliegue;
import com.autodeploy.repository.DespliegueRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DespliegueServiceTest {

    @Mock
    private DespliegueRepository despliegueRepository;

    @InjectMocks
    private DespliegueService despliegueService;

    private Despliegue despliegueExistente;

    @BeforeEach
    void setUp() {
        despliegueExistente = new Despliegue("srv-1", "git", "https://github.com/foo/bar");
        despliegueExistente.setId("dep-1");
    }

    @Test
    @DisplayName("registrar: persiste y devuelve un nuevo despliegue")
    void registrar_persiste() {
        when(despliegueRepository.save(any(Despliegue.class))).thenReturn(despliegueExistente);

        Despliegue resultado = despliegueService.registrar("srv-1", "git", "https://github.com/foo/bar");

        assertThat(resultado).isNotNull();
        assertThat(resultado.getId()).isEqualTo("dep-1");
        verify(despliegueRepository).save(any(Despliegue.class));
    }

    @Test
    @DisplayName("completar: marca el despliegue como completado con mensaje y fechaFin")
    void completar_marcaComoCompletado() {
        when(despliegueRepository.findById("dep-1")).thenReturn(Optional.of(despliegueExistente));
        when(despliegueRepository.save(any(Despliegue.class))).thenAnswer(inv -> inv.getArgument(0));

        Despliegue resultado = despliegueService.completar("dep-1", "Build OK");

        assertThat(resultado.getEstado()).isEqualTo("completado");
        assertThat(resultado.getMensaje()).isEqualTo("Build OK");
        assertThat(resultado.getFechaFin()).isNotNull();
    }

    @Test
    @DisplayName("completar: lanza 404 si el id no existe")
    void completar_lanza404SiNoExiste() {
        when(despliegueRepository.findById("dep-x")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> despliegueService.completar("dep-x", "OK"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("fallar: marca el despliegue como fallido")
    void fallar_marcaComoFallido() {
        when(despliegueRepository.findById("dep-1")).thenReturn(Optional.of(despliegueExistente));
        when(despliegueRepository.save(any(Despliegue.class))).thenAnswer(inv -> inv.getArgument(0));

        Despliegue resultado = despliegueService.fallar("dep-1", "Error build");

        assertThat(resultado.getEstado()).isEqualTo("fallido");
        assertThat(resultado.getMensaje()).isEqualTo("Error build");
    }

    @Test
    @DisplayName("fallar: lanza 404 si el id no existe")
    void fallar_lanza404SiNoExiste() {
        when(despliegueRepository.findById("dep-x")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> despliegueService.fallar("dep-x", "Error"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("obtenerHistorial: devuelve los ultimos 20")
    void obtenerHistorial_devuelveUltimos20() {
        when(despliegueRepository.findTop20ByOrderByFechaInicioDesc()).thenReturn(List.of(despliegueExistente));

        List<Despliegue> resultado = despliegueService.obtenerHistorial();

        assertThat(resultado).hasSize(1);
        assertThat(resultado.get(0).getId()).isEqualTo("dep-1");
    }

    @Test
    @DisplayName("obtenerHistorialPaginado: delega al repositorio con el Pageable")
    void obtenerHistorialPaginado_delega() {
        Pageable page = PageRequest.of(0, 10);
        Page<Despliegue> esperado = new PageImpl<>(List.of(despliegueExistente));
        when(despliegueRepository.findAllByOrderByFechaInicioDesc(page)).thenReturn(esperado);

        Page<Despliegue> resultado = despliegueService.obtenerHistorialPaginado(page);

        assertThat(resultado.getTotalElements()).isEqualTo(1);
    }

    @Test
    @DisplayName("obtenerPorServidor: filtra por servidorId ordenado desc por fecha")
    void obtenerPorServidor_filtra() {
        when(despliegueRepository.findByServidorIdOrderByFechaInicioDesc("srv-1")).thenReturn(List.of(despliegueExistente));

        List<Despliegue> resultado = despliegueService.obtenerPorServidor("srv-1");

        assertThat(resultado).hasSize(1);
    }

    @Test
    @DisplayName("obtenerPorServidorPaginado: filtra por servidorId con paginacion")
    void obtenerPorServidorPaginado_filtra() {
        Pageable page = PageRequest.of(0, 5);
        Page<Despliegue> esperado = new PageImpl<>(List.of(despliegueExistente));
        when(despliegueRepository.findByServidorIdOrderByFechaInicioDesc("srv-1", page)).thenReturn(esperado);

        Page<Despliegue> resultado = despliegueService.obtenerPorServidorPaginado("srv-1", page);

        assertThat(resultado.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("obtenerPorId: devuelve el despliegue cuando existe")
    void obtenerPorId_devuelve() {
        when(despliegueRepository.findById("dep-1")).thenReturn(Optional.of(despliegueExistente));

        assertThat(despliegueService.obtenerPorId("dep-1").getId()).isEqualTo("dep-1");
    }

    @Test
    @DisplayName("obtenerPorId: lanza 404 si no existe")
    void obtenerPorId_lanza404() {
        when(despliegueRepository.findById("dep-x")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> despliegueService.obtenerPorId("dep-x"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("buscarPorTokenWebhook: delega al repositorio")
    void buscarPorTokenWebhook_delega() {
        when(despliegueRepository.findByTokenWebhook("tok-abc")).thenReturn(Optional.of(despliegueExistente));

        Optional<Despliegue> resultado = despliegueService.buscarPorTokenWebhook("tok-abc");

        assertThat(resultado).isPresent();
    }

    @Test
    @DisplayName("actualizarMetadatosGit: persiste los metadatos en el despliegue")
    void actualizarMetadatosGit_persiste() {
        when(despliegueRepository.findById("dep-1")).thenReturn(Optional.of(despliegueExistente));
        when(despliegueRepository.save(any(Despliegue.class))).thenAnswer(inv -> inv.getArgument(0));

        Despliegue resultado = despliegueService.actualizarMetadatosGit("dep-1", "node", "main", "/srv/app", "tok-xyz");

        assertThat(resultado.getTecnologia()).isEqualTo("node");
        assertThat(resultado.getRama()).isEqualTo("main");
        assertThat(resultado.getDirectorioRemoto()).isEqualTo("/srv/app");
        assertThat(resultado.getTokenWebhook()).isEqualTo("tok-xyz");
    }

    @Test
    @DisplayName("generarTokenWebhook: produce un token base64-url no vacio")
    void generarTokenWebhook_produceTokenValido() {
        String token = despliegueService.generarTokenWebhook();

        assertThat(token).isNotBlank();
        // El token tiene 24 bytes -> base64 url sin padding = 32 chars
        assertThat(token).hasSize(32);
        // No tiene caracteres de URL prohibidos
        assertThat(token).matches("[A-Za-z0-9_-]+");
    }

    @Test
    @DisplayName("generarTokenWebhook: tokens consecutivos son distintos")
    void generarTokenWebhook_tokensDistintos() {
        String t1 = despliegueService.generarTokenWebhook();
        String t2 = despliegueService.generarTokenWebhook();

        assertThat(t1).isNotEqualTo(t2);
    }
}
