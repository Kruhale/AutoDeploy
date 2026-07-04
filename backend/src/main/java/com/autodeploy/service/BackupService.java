package com.autodeploy.service;

import com.autodeploy.model.Backup;
import com.autodeploy.model.Servidor;
import com.autodeploy.repository.BackupRepository;
import com.autodeploy.repository.ServidorRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
public class BackupService {

    private static final Logger LOGGER = LoggerFactory.getLogger(BackupService.class);
    private static final String RUTA_BACKUPS = "$HOME/.autodeploy/backups";
    private static final String RUTA_SCRIPT_REMOTO = "$HOME/.autodeploy/backup.sh";
    private static final String MARCA_CRON = "autodeploy-backup";

    private final BackupRepository backupRepository;
    private final ServidorService servidorService;
    private final ServidorRepository servidorRepository;
    private final SshCommandService sshCommandService;

    public BackupService(BackupRepository backupRepository,
                         ServidorService servidorService,
                         ServidorRepository servidorRepository,
                         SshCommandService sshCommandService) {
        this.backupRepository = backupRepository;
        this.servidorService = servidorService;
        this.servidorRepository = servidorRepository;
        this.sshCommandService = sshCommandService;
    }

    public List<Backup> listarPorServidor(String servidorId) {
        return backupRepository.findByServidorIdOrderByFechaCreacionDesc(servidorId);
    }

    public Backup crearBackup(String servidorId, String tipo) {
        Servidor servidor = servidorService.obtenerPorId(servidorId);

        Backup nuevoBackup = new Backup(servidorId, tipo);
        Backup backupPersistido = backupRepository.save(nuevoBackup);

        CompletableFuture.runAsync(() -> ejecutarBackupEnSegundoPlano(backupPersistido, servidor));

        return backupPersistido;
    }

    private void ejecutarBackupEnSegundoPlano(Backup backup, Servidor servidor) {
        try {
            String rutaArchivo = "/tmp/autodeploy-backups/" + backup.getNombre() + ".tar.gz";
            String comandoBackup = "mkdir -p /tmp/autodeploy-backups && " +
                    "tar -czf " + rutaArchivo + " --exclude='/tmp/autodeploy-backups' " +
                    "/etc/nginx /var/www 2>/dev/null || true; " +
                    "du -h " + rutaArchivo + " | cut -f1";

            String salida = sshCommandService.ejecutarComando(servidor, comandoBackup);
            String tamanoDetectado = salida == null ? "—" : salida.trim();

            backup.setEstado("completado");
            backup.setTamano(tamanoDetectado.isBlank() ? "—" : tamanoDetectado);
            backup.setRutaArchivo(rutaArchivo);
            backupRepository.save(backup);
        } catch (Exception excepcion) {
            backup.setEstado("fallido");
            backupRepository.save(backup);
        }
    }

    public void restaurar(String idBackup) {
        Backup backup = backupRepository.findById(idBackup)
                .orElseThrow(() -> new RuntimeException("Backup no encontrado"));

        if (backup.getRutaArchivo() == null || backup.getRutaArchivo().isBlank()) {
            throw new RuntimeException("El backup no tiene archivo asociado");
        }

        Servidor servidor = servidorService.obtenerPorId(backup.getServidorId());

        Backup snapshotPrevio = new Backup(servidor.getId(), "pre-restore");
        snapshotPrevio.setEstado("en_progreso");
        Backup snapshotPrevioPersistido = backupRepository.save(snapshotPrevio);

        CompletableFuture.runAsync(() -> {
            try {
                String rutaSnapshot = RUTA_BACKUPS + "/pre-restore-" + System.currentTimeMillis() + ".tar.gz";
                String comandoSnapshot = "mkdir -p " + RUTA_BACKUPS + " && tar -czf " + rutaSnapshot + " --exclude=\"" + RUTA_BACKUPS + "\" -C $HOME . 2>/dev/null || true";
                sshCommandService.ejecutarComando(servidor, comandoSnapshot);

                String tamanoSnapshot = ejecutarSeguro(servidor, "du -h " + rutaSnapshot + " | cut -f1");
                snapshotPrevioPersistido.setEstado("completado");
                snapshotPrevioPersistido.setRutaArchivo(rutaSnapshot);
                snapshotPrevioPersistido.setTamano(tamanoSnapshot == null || tamanoSnapshot.isBlank() ? "—" : tamanoSnapshot.trim());
                backupRepository.save(snapshotPrevioPersistido);

                String comandoRestauracion = "tar -xzf " + backup.getRutaArchivo() + " -C $HOME 2>/dev/null && echo OK";
                sshCommandService.ejecutarComando(servidor, comandoRestauracion);
            } catch (Exception excepcion) {
                snapshotPrevioPersistido.setEstado("fallido");
                backupRepository.save(snapshotPrevioPersistido);
            }
        });
    }

    public void eliminar(String idBackup) {
        Backup backup = backupRepository.findById(idBackup)
                .orElseThrow(() -> new RuntimeException("Backup no encontrado"));

        if (backup.getRutaArchivo() != null) {
            try {
                Servidor servidor = servidorService.obtenerPorId(backup.getServidorId());
                sshCommandService.ejecutarComando(servidor, "rm -f " + backup.getRutaArchivo());
            } catch (Exception excepcion) {
                LOGGER.warn("No se pudo borrar archivo remoto del backup {}: {}", idBackup, excepcion.getMessage());
            }
        }

        backupRepository.delete(backup);
    }

    public Servidor activarBackupsAutomaticos(String servidorId, String hora) {
        Servidor servidor = servidorService.obtenerPorId(servidorId);
        String horaSanitizada = sanitizarHora(hora);
        String[] partes = horaSanitizada.split(":");
        String minuto = partes[1];
        String horaCron = partes[0];

        String rutaBackupsExpandida = RUTA_BACKUPS;
        String rutaScriptExpandida = RUTA_SCRIPT_REMOTO;

        String comandoInstalacion =
                "mkdir -p " + rutaBackupsExpandida + " 2>/dev/null && " +
                "cat > " + rutaScriptExpandida + " << 'BACKUPSCRIPT'\n" +
                "#!/bin/sh\n" +
                "FECHA=$(date +%Y%m%d-%H%M%S)\n" +
                "RUTA=\"" + rutaBackupsExpandida + "/auto-${FECHA}.tar.gz\"\n" +
                "mkdir -p " + rutaBackupsExpandida + "\n" +
                "tar -czf \"$RUTA\" --exclude=\"" + rutaBackupsExpandida + "\" -C $HOME . 2>/dev/null || true\n" +
                "find " + rutaBackupsExpandida + " -name 'auto-*.tar.gz' -mtime +7 -delete 2>/dev/null || true\n" +
                "BACKUPSCRIPT\n" +
                "chmod +x " + rutaScriptExpandida + " && " +
                "(crontab -l 2>/dev/null | grep -v '" + MARCA_CRON + "'; echo '" + minuto + " " + horaCron + " * * * " + rutaScriptExpandida + " # " + MARCA_CRON + "') | crontab - 2>/dev/null || echo 'cron-not-supported'";

        ejecutarSeguro(servidor, comandoInstalacion);

        servidor.setBackupsAutomaticosActivos(true);
        servidor.setHoraBackupAutomatico(horaSanitizada);
        return servidorRepository.save(servidor);
    }

    public Servidor desactivarBackupsAutomaticos(String servidorId) {
        Servidor servidor = servidorService.obtenerPorId(servidorId);

        String comandoDesinstalacion =
                "(crontab -l 2>/dev/null | grep -v '" + MARCA_CRON + "') | crontab - 2>/dev/null || true; " +
                "rm -f " + RUTA_SCRIPT_REMOTO + " 2>/dev/null || true";

        ejecutarSeguro(servidor, comandoDesinstalacion);

        servidor.setBackupsAutomaticosActivos(false);
        return servidorRepository.save(servidor);
    }

    @Scheduled(fixedDelay = 120000, initialDelay = 30000)
    public void escanearBackupsAutomaticos() {
        List<Servidor> servidoresConAutoActivo = servidorRepository.findAll().stream()
                .filter(Servidor::isBackupsAutomaticosActivos)
                .collect(Collectors.toList());

        for (Servidor servidor : servidoresConAutoActivo) {
            try {
                escanearServidor(servidor);
            } catch (Exception excepcion) {
                LOGGER.warn("Error al escanear backups en servidor {}: {}", servidor.getId(), excepcion.getMessage());
            }
        }
    }

    private void escanearServidor(Servidor servidor) {
        String comandoListado = "ls -1 " + RUTA_BACKUPS + "/auto-*.tar.gz 2>/dev/null | sort";
        String salida = sshCommandService.ejecutarComando(servidor, comandoListado);
        if (salida == null || salida.isBlank()) return;

        List<String> rutas = Arrays.stream(salida.split("\n"))
                .map(String::trim)
                .filter(linea -> !linea.isBlank())
                .collect(Collectors.toList());

        Set<String> rutasYaRegistradas = backupRepository.findByServidorIdOrderByFechaCreacionDesc(servidor.getId()).stream()
                .map(Backup::getRutaArchivo)
                .filter(ruta -> ruta != null)
                .collect(Collectors.toCollection(HashSet::new));

        for (String ruta : rutas) {
            if (rutasYaRegistradas.contains(ruta)) continue;

            Backup nuevoBackup = new Backup(servidor.getId(), "auto");
            nuevoBackup.setNombre(extraerNombreDesdeRuta(ruta));
            nuevoBackup.setEstado("completado");
            nuevoBackup.setRutaArchivo(ruta);
            nuevoBackup.setFechaCreacion(extraerFechaDesdeRuta(ruta));

            String tamanoSalida = ejecutarSeguro(servidor, "du -h " + ruta + " | cut -f1");
            nuevoBackup.setTamano(tamanoSalida == null || tamanoSalida.isBlank() ? "—" : tamanoSalida.trim());

            backupRepository.save(nuevoBackup);
        }
    }

    private String extraerNombreDesdeRuta(String ruta) {
        int ultimaBarra = ruta.lastIndexOf('/');
        String nombreArchivo = ultimaBarra >= 0 ? ruta.substring(ultimaBarra + 1) : ruta;
        return nombreArchivo.replace(".tar.gz", "");
    }

    private LocalDateTime extraerFechaDesdeRuta(String ruta) {
        try {
            String nombre = extraerNombreDesdeRuta(ruta);
            String marcaTemporal = nombre.replace("auto-", "");
            DateTimeFormatter formato = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss");
            return LocalDateTime.parse(marcaTemporal, formato);
        } catch (Exception ignorado) {
            return LocalDateTime.now();
        }
    }

    private String sanitizarHora(String hora) {
        if (hora == null || !hora.matches("^\\d{1,2}:\\d{2}$")) return "03:00";
        String[] partes = hora.split(":");
        int h = Math.max(0, Math.min(23, Integer.parseInt(partes[0])));
        int m = Math.max(0, Math.min(59, Integer.parseInt(partes[1])));
        return String.format("%02d:%02d", h, m);
    }

    private String ejecutarSeguro(Servidor servidor, String comando) {
        try {
            return sshCommandService.ejecutarComando(servidor, comando);
        } catch (Exception excepcion) {
            return "";
        }
    }
}
