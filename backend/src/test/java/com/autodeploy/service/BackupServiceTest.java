package com.autodeploy.service;

import com.autodeploy.model.Backup;
import com.autodeploy.model.Servidor;
import com.autodeploy.repository.BackupRepository;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BackupServiceTest {

    @Mock
    private BackupRepository backupRepository;
    @Mock
    private ServidorService servidorService;
    @Mock
    private ServidorRepository servidorRepository;
    @Mock
    private SshCommandService sshCommandService;

    @InjectMocks
    private BackupService backupService;

    private Servidor servidor;
    private Backup backupExistente;

    @BeforeEach
    void setUp() {
        servidor = new Servidor();
        servidor.setId("srv-1");

        backupExistente = new Backup("srv-1", "manual");
        backupExistente.setId("bk-1");
        backupExistente.setRutaArchivo("/tmp/autodeploy-backups/manual.tar.gz");
    }

    @Test
    @DisplayName("listarPorServidor: delega al repositorio ordenado por fecha desc")
    void listarPorServidor_delega() {
        when(backupRepository.findByServidorIdOrderByFechaCreacionDesc("srv-1")).thenReturn(List.of(backupExistente));

        assertThat(backupService.listarPorServidor("srv-1")).hasSize(1);
    }

    @Test
    @DisplayName("crearBackup: persiste el registro y devuelve el id (la ejecucion es asincrona)")
    void crearBackup_persiste() {
        when(servidorService.obtenerPorId("srv-1")).thenReturn(servidor);
        when(backupRepository.save(any(Backup.class))).thenAnswer(inv -> {
            Backup b = inv.getArgument(0);
            b.setId("bk-2");
            return b;
        });

        Backup resultado = backupService.crearBackup("srv-1", "manual");

        assertThat(resultado.getId()).isEqualTo("bk-2");
        assertThat(resultado.getServidorId()).isEqualTo("srv-1");
        assertThat(resultado.getTipo()).isEqualTo("manual");
    }

    @Test
    @DisplayName("restaurar: lanza si el backup no existe")
    void restaurar_lanzaSiNoExiste() {
        when(backupRepository.findById("bk-x")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> backupService.restaurar("bk-x"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Backup no encontrado");
    }

    @Test
    @DisplayName("restaurar: lanza si el backup no tiene ruta de archivo asociada")
    void restaurar_lanzaSiSinRuta() {
        Backup sinRuta = new Backup("srv-1", "manual");
        sinRuta.setId("bk-3");
        sinRuta.setRutaArchivo(null);
        when(backupRepository.findById("bk-3")).thenReturn(Optional.of(sinRuta));

        assertThatThrownBy(() -> backupService.restaurar("bk-3"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("no tiene archivo asociado");
    }

    @Test
    @DisplayName("restaurar: persiste un snapshot pre-restore en estado en_progreso")
    void restaurar_creaSnapshotPrevio() {
        when(backupRepository.findById("bk-1")).thenReturn(Optional.of(backupExistente));
        when(servidorService.obtenerPorId("srv-1")).thenReturn(servidor);
        when(backupRepository.save(any(Backup.class))).thenAnswer(inv -> inv.getArgument(0));

        backupService.restaurar("bk-1");

        ArgumentCaptor<Backup> captor = ArgumentCaptor.forClass(Backup.class);
        verify(backupRepository).save(captor.capture());
        assertThat(captor.getValue().getTipo()).isEqualTo("pre-restore");
        assertThat(captor.getValue().getEstado()).isEqualTo("en_progreso");
    }

    @Test
    @DisplayName("eliminar: lanza si el backup no existe")
    void eliminar_lanzaSiNoExiste() {
        when(backupRepository.findById("bk-x")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> backupService.eliminar("bk-x"))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    @DisplayName("eliminar: borra el archivo remoto via SSH y luego el registro")
    void eliminar_borraRemotoYLocal() {
        when(backupRepository.findById("bk-1")).thenReturn(Optional.of(backupExistente));
        when(servidorService.obtenerPorId("srv-1")).thenReturn(servidor);

        backupService.eliminar("bk-1");

        verify(sshCommandService).ejecutarComando(eq(servidor), contains("rm -f " + backupExistente.getRutaArchivo()));
        verify(backupRepository).delete(backupExistente);
    }

    @Test
    @DisplayName("eliminar: tolera fallo SSH y aun asi borra el registro local")
    void eliminar_toleraFalloSsh() {
        when(backupRepository.findById("bk-1")).thenReturn(Optional.of(backupExistente));
        when(servidorService.obtenerPorId("srv-1")).thenReturn(servidor);
        when(sshCommandService.ejecutarComando(any(), any())).thenThrow(new RuntimeException("SSH fail"));

        backupService.eliminar("bk-1");

        verify(backupRepository).delete(backupExistente);
    }

    @Test
    @DisplayName("activarBackupsAutomaticos: persiste el servidor con backupsAutomaticosActivos=true y la hora sanitizada")
    void activarBackupsAutomaticos_persiste() {
        when(servidorService.obtenerPorId("srv-1")).thenReturn(servidor);
        when(servidorRepository.save(any(Servidor.class))).thenAnswer(inv -> inv.getArgument(0));

        Servidor resultado = backupService.activarBackupsAutomaticos("srv-1", "03:30");

        assertThat(resultado.isBackupsAutomaticosActivos()).isTrue();
        assertThat(resultado.getHoraBackupAutomatico()).isEqualTo("03:30");
        verify(sshCommandService).ejecutarComando(eq(servidor), contains("crontab"));
    }

    @Test
    @DisplayName("activarBackupsAutomaticos: hora invalida cae al default 03:00")
    void activarBackupsAutomaticos_horaInvalida() {
        when(servidorService.obtenerPorId("srv-1")).thenReturn(servidor);
        when(servidorRepository.save(any(Servidor.class))).thenAnswer(inv -> inv.getArgument(0));

        Servidor resultado = backupService.activarBackupsAutomaticos("srv-1", "no-es-hora");

        assertThat(resultado.getHoraBackupAutomatico()).isEqualTo("03:00");
    }

    @Test
    @DisplayName("activarBackupsAutomaticos: hora fuera de rango se sanitiza (25:99 -> 23:59)")
    void activarBackupsAutomaticos_horaFueraDeRango() {
        when(servidorService.obtenerPorId("srv-1")).thenReturn(servidor);
        when(servidorRepository.save(any(Servidor.class))).thenAnswer(inv -> inv.getArgument(0));

        Servidor resultado = backupService.activarBackupsAutomaticos("srv-1", "25:99");

        assertThat(resultado.getHoraBackupAutomatico()).isEqualTo("23:59");
    }

    @Test
    @DisplayName("desactivarBackupsAutomaticos: pone backupsAutomaticosActivos=false y limpia el cron remoto")
    void desactivarBackupsAutomaticos_persiste() {
        servidor.setBackupsAutomaticosActivos(true);
        when(servidorService.obtenerPorId("srv-1")).thenReturn(servidor);
        when(servidorRepository.save(any(Servidor.class))).thenAnswer(inv -> inv.getArgument(0));

        Servidor resultado = backupService.desactivarBackupsAutomaticos("srv-1");

        assertThat(resultado.isBackupsAutomaticosActivos()).isFalse();
        verify(sshCommandService).ejecutarComando(eq(servidor), contains("crontab"));
    }

    @Test
    @DisplayName("escanearBackupsAutomaticos: no toca servidores sin auto activo")
    void escanearBackupsAutomaticos_ignoraServidoresSinAuto() {
        Servidor sinAuto = new Servidor();
        sinAuto.setId("srv-2");
        sinAuto.setBackupsAutomaticosActivos(false);
        when(servidorRepository.findAll()).thenReturn(List.of(sinAuto));

        backupService.escanearBackupsAutomaticos();

        verify(sshCommandService, org.mockito.Mockito.never()).ejecutarComando(any(), any());
    }

    @Test
    @DisplayName("escanearBackupsAutomaticos: descubre y persiste nuevos auto-*.tar.gz")
    void escanearBackupsAutomaticos_descubreNuevos() {
        servidor.setBackupsAutomaticosActivos(true);
        when(servidorRepository.findAll()).thenReturn(List.of(servidor));
        when(sshCommandService.ejecutarComando(eq(servidor), contains("ls -1")))
                .thenReturn("/home/x/.autodeploy/backups/auto-20260101-030000.tar.gz");
        when(sshCommandService.ejecutarComando(eq(servidor), contains("du -h")))
                .thenReturn("123M");
        when(backupRepository.findByServidorIdOrderByFechaCreacionDesc("srv-1")).thenReturn(List.of());

        backupService.escanearBackupsAutomaticos();

        ArgumentCaptor<Backup> captor = ArgumentCaptor.forClass(Backup.class);
        verify(backupRepository).save(captor.capture());
        assertThat(captor.getValue().getTipo()).isEqualTo("auto");
        assertThat(captor.getValue().getNombre()).isEqualTo("auto-20260101-030000");
        assertThat(captor.getValue().getTamano()).isEqualTo("123M");
    }
}
