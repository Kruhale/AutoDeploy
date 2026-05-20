package com.autodeploy.service;

import com.autodeploy.model.Servidor;
import com.autodeploy.repository.ServidorRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReconexionServiceTest {

    @Mock
    private ServidorRepository servidorRepository;

    @Mock
    private SshCommandService sshCommandService;

    @Mock
    private BackupService backupService;

    @InjectMocks
    private ReconexionService reconexionService;

    private Servidor servidorPruebas;

    @BeforeEach
    void prepararServidorBase() {
        servidorPruebas = new Servidor();
        servidorPruebas.setId("srv-1");
        servidorPruebas.setNombre("VPS de prueba");
        servidorPruebas.setDireccionIp("203.0.113.10");
        servidorPruebas.setEstado("pendiente");
        servidorPruebas.setFallosConsecutivosSsh(0);
        when(servidorRepository.save(any(Servidor.class))).thenAnswer(invocacion -> invocacion.getArgument(0));
    }

    @Test
    @DisplayName("anotarPing: ping OK marca conectado y resetea fallos")
    void anotarPing_deberiaMarcarConectadoYResetearFallos_cuandoConexionFunciona() {
        servidorPruebas.setFallosConsecutivosSsh(2);
        servidorPruebas.setEstado("pendiente");

        reconexionService.anotarPing(servidorPruebas, true);

        assertThat(servidorPruebas.getEstado()).isEqualTo("conectado");
        assertThat(servidorPruebas.getFallosConsecutivosSsh()).isZero();
        verify(servidorRepository).save(servidorPruebas);
    }

    @Test
    @DisplayName("anotarPing: 1 fallo no cambia el estado")
    void anotarPing_deberiaIncrementarFallos_sinCambiarEstado_paraPrimerFallo() {
        servidorPruebas.setFallosConsecutivosSsh(0);
        servidorPruebas.setEstado("conectado");

        reconexionService.anotarPing(servidorPruebas, false);

        assertThat(servidorPruebas.getFallosConsecutivosSsh()).isEqualTo(1);
        assertThat(servidorPruebas.getEstado()).isEqualTo("conectado");
        verify(servidorRepository).save(servidorPruebas);
    }

    @Test
    @DisplayName("anotarPing: el tercer fallo consecutivo marca desconectado")
    void anotarPing_deberiaMarcarDesconectado_alTercerFalloConsecutivo() {
        servidorPruebas.setFallosConsecutivosSsh(2);
        servidorPruebas.setEstado("conectado");

        reconexionService.anotarPing(servidorPruebas, false);

        assertThat(servidorPruebas.getFallosConsecutivosSsh()).isEqualTo(3);
        assertThat(servidorPruebas.getEstado()).isEqualTo("desconectado");
        verify(servidorRepository).save(servidorPruebas);
    }

    @Test
    @DisplayName("anotarPing: ping OK tras varios fallos recupera el estado conectado")
    void anotarPing_deberiaRecuperarse_cuandoVuelveAResponderTrasFallos() {
        servidorPruebas.setFallosConsecutivosSsh(5);
        servidorPruebas.setEstado("desconectado");

        reconexionService.anotarPing(servidorPruebas, true);

        assertThat(servidorPruebas.getEstado()).isEqualTo("conectado");
        assertThat(servidorPruebas.getFallosConsecutivosSsh()).isZero();
    }

    @Test
    @DisplayName("refrescarEstado: salida con OK marca conectado")
    void refrescarEstado_deberiaMarcarConectado_cuandoSshDevuelveOk() {
        when(sshCommandService.ejecutarComando(servidorPruebas, "echo OK")).thenReturn("OK\n");

        boolean resultado = reconexionService.refrescarEstado(servidorPruebas);

        assertThat(resultado).isTrue();
        assertThat(servidorPruebas.getEstado()).isEqualTo("conectado");
        assertThat(servidorPruebas.getFallosConsecutivosSsh()).isZero();
    }

    @Test
    @DisplayName("refrescarEstado: excepción SSH no rethrows y cuenta como fallo")
    void refrescarEstado_deberiaContarComoFallo_cuandoSshLanzaExcepcion() {
        when(sshCommandService.ejecutarComando(servidorPruebas, "echo OK"))
                .thenThrow(new RuntimeException("connection refused"));

        boolean resultado = reconexionService.refrescarEstado(servidorPruebas);

        assertThat(resultado).isFalse();
        assertThat(servidorPruebas.getFallosConsecutivosSsh()).isEqualTo(1);
        verify(backupService, never()).activarBackupsAutomaticos(any(), any());
    }
}
