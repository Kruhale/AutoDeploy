package com.autodeploy.service;

import com.autodeploy.model.Servidor;
import com.autodeploy.util.CifradoUtil;
import org.apache.sshd.client.SshClient;
import org.apache.sshd.client.session.ClientSession;
import org.apache.sshd.common.keyprovider.FileKeyPairProvider;
import org.apache.sshd.sftp.client.SftpClient;
import org.apache.sshd.sftp.client.SftpClientFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyPair;
import java.util.stream.Stream;
import java.util.concurrent.TimeUnit;

@Service
public class SftpUploadService {

    @Value("${autodeploy.cifrado.clave}")
    private String claveCifrado;

    public void subirCarpeta(Servidor servidor, Path carpetaLocal, String rutaRemota) {
        SshClient cliente = SshClient.setUpDefaultClient();
        cliente.start();

        try (ClientSession sesion = cliente.connect(
                servidor.getUsuarioSsh(),
                servidor.getDireccionIp(),
                servidor.getPuertoSsh()
        ).verify(15, TimeUnit.SECONDS).getSession()) {

            autenticarSesion(sesion, servidor);
            sesion.auth().verify(15, TimeUnit.SECONDS);

            SftpClientFactory fabricaSftp = SftpClientFactory.instance();
            try (SftpClient clienteSftp = fabricaSftp.createSftpClient(sesion)) {
                crearDirectorioRemoto(clienteSftp, rutaRemota);
                subirArbolDeArchivos(clienteSftp, carpetaLocal, rutaRemota);
            }
        } catch (Exception excepcion) {
            throw new RuntimeException("Error al subir carpeta SFTP a " + servidor.getDireccionIp() + ": " + excepcion.getMessage(), excepcion);
        } finally {
            cliente.stop();
        }
    }

    private void subirArbolDeArchivos(SftpClient clienteSftp, Path raizLocal, String raizRemota) throws IOException {
        try (Stream<Path> recorridoArchivos = Files.walk(raizLocal)) {
            recorridoArchivos.forEach(rutaActual -> {
                try {
                    Path rutaRelativa = raizLocal.relativize(rutaActual);
                    String rutaRemotaCompleta = raizRemota + "/" + rutaRelativa.toString().replace('\\', '/');
                    boolean esRaiz = rutaRelativa.toString().isEmpty();

                    if (esRaiz) {
                        return;
                    }

                    if (Files.isDirectory(rutaActual)) {
                        crearDirectorioRemoto(clienteSftp, rutaRemotaCompleta);
                    } else {
                        subirArchivo(clienteSftp, rutaActual, rutaRemotaCompleta);
                    }
                } catch (Exception fallo) {
                    throw new RuntimeException("Fallo al subir " + rutaActual + ": " + fallo.getMessage(), fallo);
                }
            });
        }
    }

    private void subirArchivo(SftpClient clienteSftp, Path archivoLocal, String rutaRemota) throws IOException {
        try (OutputStream salidaRemota = clienteSftp.write(rutaRemota)) {
            Files.copy(archivoLocal, salidaRemota);
        }
    }

    private void crearDirectorioRemoto(SftpClient clienteSftp, String rutaRemota) {
        try {
            clienteSftp.mkdir(rutaRemota);
        } catch (IOException directorioPosiblementeExiste) {
            // Ignorar si ya existe; otros errores los reporta la siguiente operación
        }
    }

    private void autenticarSesion(ClientSession sesion, Servidor servidor) throws Exception {
        if ("password".equals(servidor.getMetodoAutenticacion())) {
            String passwordDescifrada = CifradoUtil.descifrar(servidor.getPasswordCifrada(), claveCifrado);
            sesion.addPasswordIdentity(passwordDescifrada);
        } else if ("key".equals(servidor.getMetodoAutenticacion())) {
            String clavePrivadaDescifrada = CifradoUtil.descifrar(servidor.getClaveSshPrivada(), claveCifrado);
            Path archivoTemporal = Files.createTempFile("ssh_key_", ".pem");
            try {
                Files.writeString(archivoTemporal, clavePrivadaDescifrada);
                FileKeyPairProvider proveedorClaves = new FileKeyPairProvider(archivoTemporal);
                for (KeyPair parClaves : proveedorClaves.loadKeys(null)) {
                    sesion.addPublicKeyIdentity(parClaves);
                }
            } finally {
                Files.deleteIfExists(archivoTemporal);
            }
        }
    }
}
