package com.autodeploy.service;

import com.autodeploy.dto.ConexionSshRequest;
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
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ServidorServiceTest {

    @Mock
    private ServidorRepository servidorRepository;

    @InjectMocks
    private ServidorService servidorService;

    private static final String CLAVE_CIFRADO_TEST = "claveDeTest1234!";

    private Servidor servidorExistente;

    @BeforeEach
    void configurarDatosDePrueba() {
        ReflectionTestUtils.setField(servidorService, "claveCifrado", CLAVE_CIFRADO_TEST);

        servidorExistente = new Servidor();
        servidorExistente.setId("id-servidor-456");
        servidorExistente.setNombre("Servidor de produccion");
        servidorExistente.setDireccionIp("192.168.1.10");
        servidorExistente.setPuertoSsh(22);
        servidorExistente.setUsuarioSsh("root");
        servidorExistente.setMetodoAutenticacion("password");
        servidorExistente.setEstado("conectado");
    }

    @Test
    @DisplayName("registrar: guarda servidor con password cifrada cuando el metodo es password")
    void registrar_deberiaGuardarServidorConPasswordCifrada_cuandoMetodoEsPassword() {
        ConexionSshRequest peticion = new ConexionSshRequest(
                "Servidor de produccion",
                "192.168.1.10",
                22,
                "root",
                "password",
                "miPasswordSecreta",
                null
        );

        when(servidorRepository.save(any(Servidor.class))).thenReturn(servidorExistente);

        Servidor resultado = servidorService.registrar(peticion, "usuario-test-1");

        assertThat(resultado).isNotNull();
        assertThat(resultado.getNombre()).isEqualTo("Servidor de produccion");
        verify(servidorRepository).save(any(Servidor.class));
    }

    @Test
    @DisplayName("registrar: guarda servidor con clave SSH cifrada cuando el metodo es key")
    void registrar_deberiaGuardarServidorConClaveSshCifrada_cuandoMetodoEsKey() {
        ConexionSshRequest peticion = new ConexionSshRequest(
                "Servidor de desarrollo",
                "10.0.0.5",
                22,
                "ubuntu",
                "key",
                null,
                "-----BEGIN RSA PRIVATE KEY-----"
        );

        Servidor servidorConClave = new Servidor();
        servidorConClave.setId("id-servidor-789");
        servidorConClave.setMetodoAutenticacion("key");

        when(servidorRepository.save(any(Servidor.class))).thenReturn(servidorConClave);

        Servidor resultado = servidorService.registrar(peticion, "usuario-test-1");

        assertThat(resultado).isNotNull();
        assertThat(resultado.getMetodoAutenticacion()).isEqualTo("key");
        verify(servidorRepository).save(any(Servidor.class));
    }

    @Test
    @DisplayName("listar: devuelve todos los servidores")
    void listar_deberiaRetornarTodosLosServidores() {
        Servidor segundoServidor = new Servidor();
        segundoServidor.setId("id-servidor-002");
        segundoServidor.setNombre("Servidor de staging");

        List<Servidor> listaDeServidoresEsperada = List.of(servidorExistente, segundoServidor);

        when(servidorRepository.findAll()).thenReturn(listaDeServidoresEsperada);

        List<Servidor> resultado = servidorService.listar();

        assertThat(resultado).isNotNull();
        assertThat(resultado).hasSize(2);
        assertThat(resultado).containsExactly(servidorExistente, segundoServidor);
        verify(servidorRepository).findAll();
    }

    @Test
    @DisplayName("obtenerPorId: devuelve el servidor cuando el id existe")
    void obtenerPorId_deberiaRetornarServidor_cuandoIdExiste() {
        when(servidorRepository.findById("id-servidor-456")).thenReturn(Optional.of(servidorExistente));

        Servidor resultado = servidorService.obtenerPorId("id-servidor-456");

        assertThat(resultado).isNotNull();
        assertThat(resultado.getId()).isEqualTo("id-servidor-456");
        assertThat(resultado.getNombre()).isEqualTo("Servidor de produccion");
    }

    @Test
    @DisplayName("obtenerPorId: lanza ResourceNotFoundException cuando el id no existe")
    void obtenerPorId_deberiaLanzarResourceNotFoundException_cuandoIdNoExiste() {
        when(servidorRepository.findById("id-inexistente")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> servidorService.obtenerPorId("id-inexistente"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Servidor no encontrado");
    }

    @Test
    @DisplayName("eliminar: elimina el servidor cuando el id existe")
    void eliminar_deberiaEliminarServidor_cuandoIdExiste() {
        when(servidorRepository.existsById("id-servidor-456")).thenReturn(true);

        servidorService.eliminar("id-servidor-456");

        verify(servidorRepository).deleteById("id-servidor-456");
    }

    @Test
    @DisplayName("eliminar: lanza ResourceNotFoundException cuando el id no existe")
    void eliminar_deberiaLanzarResourceNotFoundException_cuandoIdNoExiste() {
        when(servidorRepository.existsById("id-inexistente")).thenReturn(false);

        assertThatThrownBy(() -> servidorService.eliminar("id-inexistente"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Servidor no encontrado");

        verify(servidorRepository, org.mockito.Mockito.never()).deleteById(any());
    }
}
