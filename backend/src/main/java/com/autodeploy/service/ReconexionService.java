package com.autodeploy.service;

import com.autodeploy.model.Servidor;
import com.autodeploy.repository.ServidorRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Arrays;

import java.util.List;

/**
 * Cuando arranca el backend, hace ping SSH a cada servidor para ver si sigue vivo
 * y reinstala el cron de los backups automaticos si se ha caido.
 */
@Service
public class ReconexionService {

    private static final Logger logger = LoggerFactory.getLogger(ReconexionService.class);
    private static final String MARCA_CRON_BACKUP = "autodeploy-backup";

    private final ServidorRepository servidorRepository;
    private final SshCommandService sshCommandService;
    private final BackupService backupService;
    private final Environment environment;

    public ReconexionService(ServidorRepository servidorRepository,
                             SshCommandService sshCommandService,
                             BackupService backupService,
                             Environment environment) {
        this.servidorRepository = servidorRepository;
        this.sshCommandService = sshCommandService;
        this.backupService = backupService;
        this.environment = environment;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Async
    public void reconectarTrasArranque() {
        // En perfil `test` no reconectamos: cada test recreaba el contexto y
        // disparaba un ping SSH por cada servidor en BBDD. Con timeouts de
        // 15s y decenas de servidores residuales el CI tardaba mas de 10
        // minutos. Tests usan SpyBeans/Mocks para los flujos que necesitan.
        boolean perfilTest = Arrays.asList(environment.getActiveProfiles()).contains("test");
        if (perfilTest) {
            logger.info("Reconexion al arrancar omitida (perfil test activo)");
            return;
        }

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

    /** Pinga el servidor por SSH con "echo OK" y actualiza su estado en la BBDD */
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
     * Apunta el resultado de un ping: si va bien, "conectado" y reset del contador.
     * Si falla, suma 1 al contador y marca "desconectado" al 3er fallo seguido.
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

    /** Mira si el cron del backup automatico sigue en el VPS, y si no lo vuelve a instalar */
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
