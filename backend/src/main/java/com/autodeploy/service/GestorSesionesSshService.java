package com.autodeploy.service;

import com.autodeploy.model.Servidor;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.apache.sshd.client.SshClient;
import org.apache.sshd.client.channel.ChannelExec;
import org.apache.sshd.client.session.ClientSession;
import org.apache.sshd.common.keyprovider.FileKeyPairProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyPair;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Service
public class GestorSesionesSshService {

    private static final Logger LOGGER = LoggerFactory.getLogger(GestorSesionesSshService.class);
    private static final int TIMEOUT_CONEXION_SEGUNDOS = 15;
    private static final int TIMEOUT_COMANDO_SEGUNDOS = 20;

    private final ServidorService servidorService;
    private final Map<String, ClientSession> sesionesActivas = new ConcurrentHashMap<>();
    private SshClient clienteSshCompartido;

    public GestorSesionesSshService(ServidorService servidorService) {
        this.servidorService = servidorService;
    }

    @PostConstruct
    public void inicializar() {
        this.clienteSshCompartido = SshClient.setUpDefaultClient();
        this.clienteSshCompartido.start();
        LOGGER.info("Gestor de sesiones SSH inicializado");
    }

    @PreDestroy
    public void apagar() {
        LOGGER.info("Cerrando {} sesiones SSH activas", sesionesActivas.size());
        for (Map.Entry<String, ClientSession> entrada : sesionesActivas.entrySet()) {
            try {
                entrada.getValue().close();
            } catch (Exception excepcionCierre) {
                LOGGER.warn("Error al cerrar sesion {}: {}", entrada.getKey(), excepcionCierre.getMessage());
            }
        }
        sesionesActivas.clear();
        if (clienteSshCompartido != null) {
            clienteSshCompartido.stop();
        }
    }

    public String ejecutar(String servidorId, String comando) {
        ClientSession sesionViva = obtenerSesionViva(servidorId);
        if (sesionViva == null) {
            throw new RuntimeException("No hay sesion SSH disponible para el servidor " + servidorId);
        }
        try {
            try (ChannelExec canalEjecucion = sesionViva.createExecChannel(comando)) {
                canalEjecucion.setErr(OutputStream.nullOutputStream());
                canalEjecucion.open().verify(TIMEOUT_COMANDO_SEGUNDOS, TimeUnit.SECONDS);
                String salidaComando = leerSalida(canalEjecucion.getInvertedOut());
                return salidaComando;
            }
        } catch (Exception excepcionEjecucion) {
            LOGGER.warn("Fallo al ejecutar sobre sesion {}: {}", servidorId, excepcionEjecucion.getMessage());
            descartarSesion(servidorId);
            throw new RuntimeException("Error ejecutando comando SSH: " + excepcionEjecucion.getMessage(), excepcionEjecucion);
        }
    }

    public boolean tieneSesionViva(String servidorId) {
        ClientSession sesion = sesionesActivas.get(servidorId);
        if (sesion == null) {
            return false;
        }
        boolean estaViva = sesion.isOpen() && !sesion.isClosed();
        return estaViva;
    }

    public void cerrarSesion(String servidorId) {
        ClientSession sesion = sesionesActivas.remove(servidorId);
        if (sesion != null) {
            try {
                sesion.close();
            } catch (Exception excepcionCierre) {
                LOGGER.warn("Error al cerrar sesion {}: {}", servidorId, excepcionCierre.getMessage());
            }
        }
    }

    private ClientSession obtenerSesionViva(String servidorId) {
        ClientSession sesionCacheada = sesionesActivas.get(servidorId);
        boolean sesionUsable = sesionCacheada != null && sesionCacheada.isOpen() && !sesionCacheada.isClosed();
        if (sesionUsable) {
            return sesionCacheada;
        }

        sesionesActivas.remove(servidorId, sesionCacheada);

        ClientSession sesionNueva = abrirSesionNueva(servidorId);
        if (sesionNueva == null) {
            return null;
        }

        ClientSession sesionExistenteEnRace = sesionesActivas.putIfAbsent(servidorId, sesionNueva);
        if (sesionExistenteEnRace != null) {
            cerrarSilencioso(sesionNueva);
            return sesionExistenteEnRace;
        }
        return sesionNueva;
    }

    private ClientSession abrirSesionNueva(String servidorId) {
        Servidor servidor;
        try {
            servidor = servidorService.obtenerPorId(servidorId);
        } catch (Exception excepcionBusqueda) {
            LOGGER.warn("Servidor {} no existe: {}", servidorId, excepcionBusqueda.getMessage());
            return null;
        }

        try {
            ClientSession sesionAbierta = clienteSshCompartido.connect(
                    servidor.getUsuarioSsh(),
                    servidor.getDireccionIp(),
                    servidor.getPuertoSsh()
            ).verify(TIMEOUT_CONEXION_SEGUNDOS, TimeUnit.SECONDS).getSession();

            autenticarSesion(sesionAbierta, servidor);
            sesionAbierta.auth().verify(TIMEOUT_CONEXION_SEGUNDOS, TimeUnit.SECONDS);

            LOGGER.info("Sesion SSH abierta para servidor {} ({})", servidor.getNombre(), servidor.getDireccionIp());
            return sesionAbierta;
        } catch (Exception excepcionConexion) {
            LOGGER.warn("No se pudo abrir sesion SSH a {} ({}): {}",
                    servidor.getNombre(), servidor.getDireccionIp(), excepcionConexion.getMessage());
            return null;
        }
    }

    private void autenticarSesion(ClientSession sesion, Servidor servidor) throws Exception {
        if ("password".equals(servidor.getMetodoAutenticacion())) {
            String passwordDescifrada = servidorService.descifrarPassword(servidor);
            sesion.addPasswordIdentity(passwordDescifrada);
            return;
        }

        if ("key".equals(servidor.getMetodoAutenticacion())) {
            String clavePrivadaDescifrada = servidorService.descifrarClaveSsh(servidor);
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

    private void descartarSesion(String servidorId) {
        ClientSession sesionDescartada = sesionesActivas.remove(servidorId);
        if (sesionDescartada == null) {
            return;
        }
        try {
            sesionDescartada.close();
        } catch (Exception excepcionCierre) {
            LOGGER.debug("No se pudo cerrar sesion descartada: {}", excepcionCierre.getMessage());
        }
    }

    private void cerrarSilencioso(ClientSession sesion) {
        if (sesion == null) {
            return;
        }
        try {
            sesion.close();
        } catch (Exception excepcionCierre) {
            LOGGER.debug("Sesion SSH cerrada durante resolucion de race condition: {}", excepcionCierre.getMessage());
        }
    }

    private String leerSalida(InputStream flujoEntrada) throws Exception {
        ByteArrayOutputStream bufferSalida = new ByteArrayOutputStream();
        byte[] buffer = new byte[4096];
        int bytesLeidos;
        while ((bytesLeidos = flujoEntrada.read(buffer)) != -1) {
            bufferSalida.write(buffer, 0, bytesLeidos);
        }
        String salidaTexto = bufferSalida.toString(StandardCharsets.UTF_8);
        return salidaTexto;
    }
}
