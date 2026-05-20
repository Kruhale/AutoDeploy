package com.autodeploy.service;

import com.autodeploy.model.Servidor;
import com.autodeploy.repository.ServidorRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Al arrancar el backend recorre todos los servidores guardados en BBDD,
 * verifica conexión SSH a cada uno y actualiza Servidor.estado. Si el VPS
 * tenía backups automáticos activos, además verifica que el cron sigue
 * instalado en el VPS del usuario y lo reinstala si falta.
 */
@Service
public class ReconexionService {

    private static final Logger logger = LoggerFactory.getLogger(ReconexionService.class);
    private static final String MARCA_CRON_BACKUP = "autodeploy-backup";

    private final ServidorRepository servidorRepository;
    private final SshCommandService sshCommandService;
    private final BackupService backupService;

    public ReconexionService(ServidorRepository servidorRepository,
                             SshCommandService sshCommandService,
                             BackupService backupService) {
        this.servidorRepository = servidorRepository;
        this.sshCommandService = sshCommandService;
        this.backupService = backupService;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Async
    public void reconectarTrasArranque() {
        List<Servidor> listaServidores = servidorRepository.findAll();
        logger.info("Reconexion al arrancar: {} servidores en BBDD", listaServidores.size());

        for (Servidor servidor : listaServidores) {
            refrescarEstado(servidor);
            if (servidor.isBackupsAutomaticosActivos() && "conectado".equals(servidor.getEstado())) {
                verificarCronDeBackup(servidor);
            }
        }

        logger.info("Reconexion al arrancar completada");
    }

    /**
     * Hace un ping SSH ejecutando `echo OK`. Actualiza estado y contador de
     * fallos del servidor en BBDD. Devuelve true si la conexión fue OK.
     */
    public boolean refrescarEstado(Servidor servidor) {
        try {
            String salida = sshCommandService.ejecutarComando(servidor, "echo OK");
            boolean responde = salida != null && salida.contains("OK");
            anotarPing(servidor, responde);
            return responde;
        } catch (Exception excepcion) {
            logger.warn("SSH ping fallido en servidor {} ({}): {}", servidor.getId(), servidor.getDireccionIp(), excepcion.getMessage());
            anotarPing(servidor, false);
            return false;
        }
    }

    /**
     * Punto de entrada reutilizable: aplica la regla de estado/fallos.
     * Llamado tanto desde el job al arrancar como desde MonitorMetricasService
     * tras cada ciclo de recolección.
     *
     * - Si el ping fue OK: estado="conectado", contador a 0.
     * - Si falló: contador++. A partir del 3º fallo, estado="desconectado".
     */
    public void anotarPing(Servidor servidor, boolean conexionFunciono) {
        if (conexionFunciono) {
            servidor.setEstado("conectado");
            servidor.setFallosConsecutivosSsh(0);
        } else {
            int nuevosFallos = servidor.getFallosConsecutivosSsh() + 1;
            servidor.setFallosConsecutivosSsh(nuevosFallos);
            if (nuevosFallos >= 3) {
                servidor.setEstado("desconectado");
            }
        }
        servidorRepository.save(servidor);
    }

    /**
     * Comprueba si el cron de backup automático sigue en el crontab del VPS
     * del usuario. Si no está, lo reinstala llamando a BackupService.
     */
    private void verificarCronDeBackup(Servidor servidor) {
        try {
            String crontabRemoto = sshCommandService.ejecutarComando(servidor, "crontab -l 2>/dev/null || true");
            boolean cronPresente = crontabRemoto != null && crontabRemoto.contains(MARCA_CRON_BACKUP);

            if (!cronPresente) {
                logger.info("Cron de backup ausente en servidor {}: reinstalando", servidor.getId());
                backupService.activarBackupsAutomaticos(servidor.getId(), servidor.getHoraBackupAutomatico());
            }
        } catch (Exception excepcion) {
            logger.warn("No se pudo verificar el cron de backup en servidor {}: {}", servidor.getId(), excepcion.getMessage());
        }
    }
}
