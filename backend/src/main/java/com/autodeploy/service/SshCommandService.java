package com.autodeploy.service;

import com.autodeploy.model.Servidor;
import com.autodeploy.util.CifradoUtil;
import org.apache.sshd.client.SshClient;
import org.apache.sshd.client.channel.ChannelExec;
import org.apache.sshd.client.session.ClientSession;
import org.apache.sshd.common.keyprovider.FileKeyPairProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyPair;
import java.util.concurrent.TimeUnit;

@Service
public class SshCommandService {

    @Value("${autodeploy.cifrado.clave}")
    private String claveCifrado;

    public String ejecutarComando(Servidor servidor, String comando) {
        SshClient cliente = SshClient.setUpDefaultClient();
        cliente.start();

        try (ClientSession sesionSsh = cliente.connect(
                servidor.getUsuarioSsh(),
                servidor.getDireccionIp(),
                servidor.getPuertoSsh()
        ).verify(15, TimeUnit.SECONDS).getSession()) {

            autenticarSesion(sesionSsh, servidor);
            sesionSsh.auth().verify(15, TimeUnit.SECONDS);

            try (ChannelExec canalEjecucion = sesionSsh.createExecChannel(comando)) {
                canalEjecucion.setErr(OutputStream.nullOutputStream());
                canalEjecucion.open().verify(10, TimeUnit.SECONDS);
                String salidaDelComando = leerFlujoCompleto(canalEjecucion.getInvertedOut());
                return salidaDelComando;
            }
        } catch (Exception excepcion) {
            throw new RuntimeException("Error al ejecutar comando SSH en " + servidor.getDireccionIp() + ": " + excepcion.getMessage(), excepcion);
        } finally {
            cliente.stop();
        }
    }

    private void autenticarSesion(ClientSession sesionSsh, Servidor servidor) throws Exception {
        if ("password".equals(servidor.getMetodoAutenticacion())) {
            String passwordDescifrada = CifradoUtil.descifrar(servidor.getPasswordCifrada(), claveCifrado);
            sesionSsh.addPasswordIdentity(passwordDescifrada);
        } else if ("key".equals(servidor.getMetodoAutenticacion())) {
            String clavePrivadaDescifrada = CifradoUtil.descifrar(servidor.getClaveSshPrivada(), claveCifrado);
            Path archivoTemporal = Files.createTempFile("ssh_key_", ".pem");
            try {
                Files.writeString(archivoTemporal, clavePrivadaDescifrada);
                FileKeyPairProvider proveedorClaves = new FileKeyPairProvider(archivoTemporal);
                for (KeyPair parClaves : proveedorClaves.loadKeys(null)) {
                    sesionSsh.addPublicKeyIdentity(parClaves);
                }
            } finally {
                Files.deleteIfExists(archivoTemporal);
            }
        }
    }

    private String leerFlujoCompleto(InputStream flujo) throws Exception {
        ByteArrayOutputStream bufferDeSalida = new ByteArrayOutputStream();
        byte[] buffer = new byte[4096];
        int bytesLeidos;

        while ((bytesLeidos = flujo.read(buffer)) != -1) {
            bufferDeSalida.write(buffer, 0, bytesLeidos);
        }

        String resultado = bufferDeSalida.toString(StandardCharsets.UTF_8);
        return resultado;
    }
}
