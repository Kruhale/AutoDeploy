package com.autodeploy.service;

import com.autodeploy.exception.ResourceNotFoundException;
import com.autodeploy.model.Subdominio;
import com.autodeploy.repository.SubdominioRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SubdominioServiceTest {

    @Mock
    private SubdominioRepository subdominioRepository;

    @InjectMocks
    private SubdominioService subdominioService;

    @Test
    @DisplayName("registrar: persiste un nuevo subdominio con los datos del request")
    void registrar_persiste() {
        when(subdominioRepository.save(any(Subdominio.class))).thenAnswer(inv -> inv.getArgument(0));

        Subdominio resultado = subdominioService.registrar("srv-1", "api", "A", "1.2.3.4");

        ArgumentCaptor<Subdominio> captor = ArgumentCaptor.forClass(Subdominio.class);
        verify(subdominioRepository).save(captor.capture());
        assertThat(captor.getValue().getServidorId()).isEqualTo("srv-1");
        assertThat(captor.getValue().getNombre()).isEqualTo("api");
        assertThat(captor.getValue().getTipo()).isEqualTo("A");
        assertThat(captor.getValue().getDestino()).isEqualTo("1.2.3.4");
        assertThat(resultado).isNotNull();
    }

    @Test
    @DisplayName("listarPorServidor: delega al repositorio")
    void listarPorServidor_delega() {
        Subdominio s = new Subdominio();
        when(subdominioRepository.findByServidorId("srv-1")).thenReturn(List.of(s));

        assertThat(subdominioService.listarPorServidor("srv-1")).hasSize(1);
    }

    @Test
    @DisplayName("eliminar: borra cuando existe")
    void eliminar_borraSiExiste() {
        when(subdominioRepository.existsById("sub-1")).thenReturn(true);

        subdominioService.eliminar("sub-1");

        verify(subdominioRepository).deleteById("sub-1");
    }

    @Test
    @DisplayName("eliminar: lanza 404 si no existe")
    void eliminar_lanza404SiNoExiste() {
        when(subdominioRepository.existsById("sub-x")).thenReturn(false);

        assertThatThrownBy(() -> subdominioService.eliminar("sub-x"))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(subdominioRepository, never()).deleteById(any());
    }
}
