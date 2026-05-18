package com.autodeploy.service;

import com.autodeploy.model.Servidor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
public class ZipDeployService {

    private static final long TAMANO_MAXIMO_ZIP = 50L * 1024L * 1024L;

    private final SftpUploadService sftpUploadService;
    private final SshCommandService sshCommandService;

    public ZipDeployService(SftpUploadService sftpUploadService, SshCommandService sshCommandService) {
        this.sftpUploadService = sftpUploadService;
        this.sshCommandService = sshCommandService;
    }

    public String desplegarDesdeZip(Servidor servidor, MultipartFile archivoZip, String directorioRemoto, String tecnologia) {
        validarArchivoZip(archivoZip);

        Path carpetaTemporal = null;
        try {
            carpetaTemporal = Files.createTempDirectory("autodeploy-zip-");
            extraerZip(archivoZip, carpetaTemporal);

            String comandoLimpieza = "rm -rf " + directorioRemoto + " && mkdir -p " + directorioRemoto;
            sshCommandService.ejecutarComando(servidor, comandoLimpieza);

            sftpUploadService.subirCarpeta(servidor, carpetaTemporal, directorioRemoto);

            String comandoBuild = obtenerComandoBuild(tecnologia, directorioRemoto);
            String salidaBuild = sshCommandService.ejecutarComando(servidor, comandoBuild);

            return salidaBuild;
        } catch (IOException fallo) {
            throw new RuntimeException("Error procesando ZIP: " + fallo.getMessage(), fallo);
        } finally {
            if (carpetaTemporal != null) {
                eliminarRecursivo(carpetaTemporal);
            }
        }
    }

    private void validarArchivoZip(MultipartFile archivoZip) {
        boolean archivoVacio = archivoZip == null || archivoZip.isEmpty();
        if (archivoVacio) {
            throw new IllegalArgumentException("El archivo ZIP esta vacio");
        }

        boolean demasiadoGrande = archivoZip.getSize() > TAMANO_MAXIMO_ZIP;
        if (demasiadoGrande) {
            throw new IllegalArgumentException("El ZIP excede el tamano maximo de 50 MB");
        }

        String nombreArchivo = archivoZip.getOriginalFilename();
        boolean noEsZip = nombreArchivo == null || !nombreArchivo.toLowerCase().endsWith(".zip");
        if (noEsZip) {
            throw new IllegalArgumentException("El archivo debe tener extension .zip");
        }
    }

    private void extraerZip(MultipartFile archivoZip, Path destino) throws IOException {
        try (InputStream entradaArchivo = archivoZip.getInputStream();
             ZipInputStream lectorZip = new ZipInputStream(entradaArchivo)) {

            ZipEntry entradaActual;
            while ((entradaActual = lectorZip.getNextEntry()) != null) {
                Path rutaSegura = resolverRutaSegura(destino, entradaActual.getName());

                if (entradaActual.isDirectory()) {
                    Files.createDirectories(rutaSegura);
                } else {
                    Files.createDirectories(rutaSegura.getParent());
                    Files.copy(lectorZip, rutaSegura);
                }

                lectorZip.closeEntry();
            }
        }
    }

    private Path resolverRutaSegura(Path raiz, String nombreEntrada) {
        Path rutaCandidata = raiz.resolve(nombreEntrada).normalize();
        boolean intentaSalirseDelDirectorio = !rutaCandidata.startsWith(raiz);
        if (intentaSalirseDelDirectorio) {
            throw new IllegalArgumentException("Entrada ZIP fuera del directorio destino: " + nombreEntrada);
        }
        return rutaCandidata;
    }

    private String obtenerComandoBuild(String tecnologia, String directorio) {
        Map<String, String> comandosPorTecnologia = Map.of(
                "nodejs", "cd " + directorio + " && npm install --omit=dev && (npm run build || true)",
                "react", "cd " + directorio + " && npm install && npm run build",
                "nextjs", "cd " + directorio + " && npm install && npm run build",
                "estatica", "echo 'Archivos estaticos copiados a " + directorio + "'",
                "php", "cd " + directorio + " && (composer install --no-dev 2>/dev/null || echo 'sin composer.json')",
                "python", "cd " + directorio + " && (python3 -m pip install -r requirements.txt 2>/dev/null || echo 'sin requirements.txt')",
                "docker-compose", "cd " + directorio + " && docker compose up -d --build"
        );

        String comandoEncontrado = comandosPorTecnologia.get(tecnologia);
        if (comandoEncontrado != null) {
            return comandoEncontrado;
        }
        return "echo 'Despliegue ZIP completado en " + directorio + "'";
    }

    private void eliminarRecursivo(Path carpeta) {
        try (var flujoArchivos = Files.walk(carpeta)) {
            flujoArchivos
                    .sorted(Comparator.reverseOrder())
                    .forEach(ruta -> {
                        try {
                            Files.deleteIfExists(ruta);
                        } catch (IOException ignorado) {
                            // Carpeta temporal, si falla la limpieza no es crítico
                        }
                    });
        } catch (IOException ignorado) {
            // Carpeta temporal, si falla la limpieza no es crítico
        }
    }
}
