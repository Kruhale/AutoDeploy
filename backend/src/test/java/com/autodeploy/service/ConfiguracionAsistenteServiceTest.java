package com.autodeploy.service;

import com.autodeploy.dto.ConfiguracionAsistenteRequest;
import com.autodeploy.dto.ConfiguracionAsistenteResponse;
import com.autodeploy.model.ConfiguracionAsistenteIa;
import com.autodeploy.repository.ConfiguracionAsistenteIaRepository;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConfiguracionAsistenteServiceTest {

    private static final String CLAVE_CIFRADO_TEST = "claveDeTest1234ParaCifrar!";

    @Mock
    private ConfiguracionAsistenteIaRepository configuracionRepository;

    @InjectMocks
    private ConfiguracionAsistenteService servicio;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(servicio, "claveCifrado", CLAVE_CIFRADO_TEST);
    }

    @Test
    @DisplayName("obtenerOCrear: devuelve la existente cuando ya hay configuracion para el usuario")
    void obtenerOCrear_devuelveExistente() {
        ConfiguracionAsistenteIa existente = new ConfiguracionAsistenteIa();
        existente.setUsuarioId("u-1");
        when(configuracionRepository.findByUsuarioId("u-1")).thenReturn(Optional.of(existente));

        ConfiguracionAsistenteIa resultado = servicio.obtenerOCrear("u-1");

        assertThat(resultado).isSameAs(existente);
        verify(configuracionRepository, never()).save(any());
    }

    @Test
    @DisplayName("obtenerOCrear: crea nueva configuracion vacia cuando no existe")
    void obtenerOCrear_creaNueva() {
        when(configuracionRepository.findByUsuarioId("u-1")).thenReturn(Optional.empty());
        when(configuracionRepository.save(any(ConfiguracionAsistenteIa.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ConfiguracionAsistenteIa resultado = servicio.obtenerOCrear("u-1");

        assertThat(resultado.getUsuarioId()).isEqualTo("u-1");
        verify(configuracionRepository).save(any(ConfiguracionAsistenteIa.class));
    }

    @Test
    @DisplayName("obtenerResumen: marca tieneApiKey=true cuando hay apikey cifrada")
    void obtenerResumen_tieneApiKeyTrue() {
        ConfiguracionAsistenteIa existente = new ConfiguracionAsistenteIa();
        existente.setUsuarioId("u-1");
        existente.setApiKeyCifrada("xxx-encrypted");
        existente.setModeloPreferido("google/gemini-2.5-pro");
        existente.setComandosAutoAprobados(List.of("ls", "df -h"));
        when(configuracionRepository.findByUsuarioId("u-1")).thenReturn(Optional.of(existente));

        ConfiguracionAsistenteResponse resumen = servicio.obtenerResumen("u-1");

        assertThat(resumen.apiKeyConfigurada()).isTrue();
        assertThat(resumen.modeloPreferido()).isEqualTo("google/gemini-2.5-pro");
        assertThat(resumen.comandosAutoAprobados()).containsExactly("ls", "df -h");
    }

    @Test
    @DisplayName("obtenerResumen: tieneApiKey=false cuando esta vacia o en blanco")
    void obtenerResumen_tieneApiKeyFalse() {
        ConfiguracionAsistenteIa existente = new ConfiguracionAsistenteIa();
        existente.setUsuarioId("u-1");
        existente.setApiKeyCifrada("");
        when(configuracionRepository.findByUsuarioId("u-1")).thenReturn(Optional.of(existente));

        assertThat(servicio.obtenerResumen("u-1").apiKeyConfigurada()).isFalse();
    }

    @Test
    @DisplayName("obtenerResumen: lista de comandos null se convierte en lista vacia (no NPE)")
    void obtenerResumen_comandosNullSeConvierteEnVacia() {
        ConfiguracionAsistenteIa existente = new ConfiguracionAsistenteIa();
        existente.setUsuarioId("u-1");
        existente.setComandosAutoAprobados(null);
        when(configuracionRepository.findByUsuarioId("u-1")).thenReturn(Optional.of(existente));

        ConfiguracionAsistenteResponse resumen = servicio.obtenerResumen("u-1");

        assertThat(resumen.comandosAutoAprobados()).isEmpty();
    }

    @Test
    @DisplayName("actualizar: cifra la apiKey si viene en la peticion")
    void actualizar_cifraApiKey() {
        ConfiguracionAsistenteIa existente = new ConfiguracionAsistenteIa();
        existente.setUsuarioId("u-1");
        when(configuracionRepository.findByUsuarioId("u-1")).thenReturn(Optional.of(existente));
        when(configuracionRepository.save(any(ConfiguracionAsistenteIa.class))).thenAnswer(inv -> inv.getArgument(0));

        ConfiguracionAsistenteRequest peticion = new ConfiguracionAsistenteRequest(
                "sk-or-v1-prueba", "anthropic/claude-3", List.of("uptime"));

        ConfiguracionAsistenteResponse resumen = servicio.actualizar("u-1", peticion);

        assertThat(resumen.apiKeyConfigurada()).isTrue();
        assertThat(resumen.modeloPreferido()).isEqualTo("anthropic/claude-3");
        assertThat(existente.getApiKeyCifrada()).isNotEqualTo("sk-or-v1-prueba");
        assertThat(existente.getApiKeyCifrada()).isNotBlank();
    }

    @Test
    @DisplayName("actualizar: si apiKey viene en blanco no la machaca")
    void actualizar_apiKeyEnBlancoNoMachaca() {
        ConfiguracionAsistenteIa existente = new ConfiguracionAsistenteIa();
        existente.setUsuarioId("u-1");
        existente.setApiKeyCifrada("antes-cifrada");
        when(configuracionRepository.findByUsuarioId("u-1")).thenReturn(Optional.of(existente));
        when(configuracionRepository.save(any(ConfiguracionAsistenteIa.class))).thenAnswer(inv -> inv.getArgument(0));

        servicio.actualizar("u-1", new ConfiguracionAsistenteRequest("  ", null, null));

        assertThat(existente.getApiKeyCifrada()).isEqualTo("antes-cifrada");
    }

    @Test
    @DisplayName("obtenerApiKeyDescifrada: null cuando no hay apiKey cifrada")
    void obtenerApiKeyDescifrada_nullSiNoHayKey() {
        ConfiguracionAsistenteIa existente = new ConfiguracionAsistenteIa();
        existente.setUsuarioId("u-1");
        existente.setApiKeyCifrada(null);
        when(configuracionRepository.findByUsuarioId("u-1")).thenReturn(Optional.of(existente));

        assertThat(servicio.obtenerApiKeyDescifrada("u-1")).isNull();
    }

    @Test
    @DisplayName("obtenerApiKeyDescifrada: round-trip cifrado/descifrado devuelve el original")
    void obtenerApiKeyDescifrada_roundTrip() {
        ConfiguracionAsistenteIa existente = new ConfiguracionAsistenteIa();
        existente.setUsuarioId("u-1");
        when(configuracionRepository.findByUsuarioId("u-1")).thenReturn(Optional.of(existente));
        when(configuracionRepository.save(any(ConfiguracionAsistenteIa.class))).thenAnswer(inv -> inv.getArgument(0));

        servicio.actualizar("u-1", new ConfiguracionAsistenteRequest("mi-apikey-secreta-xyz", null, null));

        String descifrada = servicio.obtenerApiKeyDescifrada("u-1");
        assertThat(descifrada).isEqualTo("mi-apikey-secreta-xyz");
    }

    @Test
    @DisplayName("estaAutoAprobado: false si la lista de patrones es null o vacia")
    void estaAutoAprobado_falseSiListaVacia() {
        assertThat(servicio.estaAutoAprobado("ls", null)).isFalse();
        assertThat(servicio.estaAutoAprobado("ls", List.of())).isFalse();
    }

    @Test
    @DisplayName("estaAutoAprobado: true si el comando empieza por uno de los patrones")
    void estaAutoAprobado_trueSiCoincide() {
        assertThat(servicio.estaAutoAprobado("ls -la /var/log", List.of("ls", "df -h"))).isTrue();
        assertThat(servicio.estaAutoAprobado("df -h", List.of("ls", "df -h"))).isTrue();
        assertThat(servicio.estaAutoAprobado("  ls  ", List.of("ls"))).isTrue();
    }

    @Test
    @DisplayName("estaAutoAprobado: false si el comando no empieza por ningun patron")
    void estaAutoAprobado_falseSiNoCoincide() {
        assertThat(servicio.estaAutoAprobado("rm -rf /", List.of("ls", "df -h"))).isFalse();
    }
}
