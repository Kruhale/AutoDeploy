package com.autodeploy.service;

import com.autodeploy.model.Servidor;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.sshd.client.SshClient;
import org.apache.sshd.client.channel.ChannelShell;
import org.apache.sshd.client.session.ClientSession;
import org.apache.sshd.common.keyprovider.FileKeyPairProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyPair;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Component
public class SshWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(SshWebSocketHandler.class);
    private static final String ATTR_SSH_CLIENT = "sshClient";
    private static final String ATTR_SSH_SESSION = "sshSession";
    private static final String ATTR_SSH_CHANNEL = "sshChannel";
    private static final String ATTR_OUTPUT_STREAM = "outputStream";
    private static final String ATTR_SESION_SINCRONIZADA = "sesionSincronizada";

    private final ServidorService servidorService;
    private final ObjectMapper objectMapper;
    private final Map<String, Thread> hilosDeLectura = new ConcurrentHashMap<>();

    public SshWebSocketHandler(ServidorService servidorService) {
        this.servidorService = servidorService;
        this.objectMapper = new ObjectMapper();
    }

    @Override
    protected void handleTextMessage(WebSocketSession sesionWs, TextMessage mensaje) throws Exception {
        WebSocketSession sesionSegura = obtenerSesionSegura(sesionWs);
        JsonNode json = objectMapper.readTree(mensaje.getPayload());
        String tipo = json.get("tipo").asText();

        if ("connect".equals(tipo)) {
            manejarConexion(sesionSegura, json);
        } else if ("input".equals(tipo)) {
            manejarEntrada(sesionSegura, json);
        } else if ("resize".equals(tipo)) {
            manejarRedimensionar(sesionSegura, json);
        }
    }

    private WebSocketSession obtenerSesionSegura(WebSocketSession sesionWs) {
        WebSocketSession existente = (WebSocketSession) sesionWs.getAttributes().get(ATTR_SESION_SINCRONIZADA);
        if (existente != null) {
            return existente;
        }
        WebSocketSession decorada = new ConcurrentWebSocketSessionDecorator(sesionWs, 5000, 1024 * 1024);
        sesionWs.getAttributes().put(ATTR_SESION_SINCRONIZADA, decorada);
        return decorada;
    }

    private void manejarConexion(WebSocketSession sesionWs, JsonNode json) {
        try {
            String servidorId = json.get("servidorId").asText();
            Servidor servidor = servidorService.obtenerPorId(servidorId);

            SshClient cliente = SshClient.setUpDefaultClient();
            cliente.start();

            ClientSession sesionSsh = cliente.connect(
                    servidor.getUsuarioSsh(),
                    servidor.getDireccionIp(),
                    servidor.getPuertoSsh()
            ).verify(15, TimeUnit.SECONDS).getSession();

            if ("password".equals(servidor.getMetodoAutenticacion())) {
                String password = servidorService.descifrarPassword(servidor);
                sesionSsh.addPasswordIdentity(password);
            } else if ("key".equals(servidor.getMetodoAutenticacion())) {
                String clavePrivada = servidorService.descifrarClaveSsh(servidor);
                Path archivoTemporal = Files.createTempFile("ssh_key_", ".pem");
                Files.writeString(archivoTemporal, clavePrivada);

                FileKeyPairProvider proveedorClaves = new FileKeyPairProvider(archivoTemporal);
                for (KeyPair parClaves : proveedorClaves.loadKeys(null)) {
                    sesionSsh.addPublicKeyIdentity(parClaves);
                }

                Files.deleteIfExists(archivoTemporal);
            }

            sesionSsh.auth().verify(15, TimeUnit.SECONDS);

            ChannelShell canalShell = sesionSsh.createShellChannel();
            canalShell.setPtyType("xterm-256color");
            canalShell.setPtyColumns(80);
            canalShell.setPtyLines(24);
            canalShell.open().verify(10, TimeUnit.SECONDS);

            OutputStream flujoSalida = canalShell.getInvertedIn();
            InputStream flujoEntrada = canalShell.getInvertedOut();

            sesionWs.getAttributes().put(ATTR_SSH_CLIENT, cliente);
            sesionWs.getAttributes().put(ATTR_SSH_SESSION, sesionSsh);
            sesionWs.getAttributes().put(ATTR_SSH_CHANNEL, canalShell);
            sesionWs.getAttributes().put(ATTR_OUTPUT_STREAM, flujoSalida);

            Thread hiloDeLectura = new Thread(new Runnable() {
                @Override
                public void run() {
                    try {
                        byte[] buffer = new byte[4096];
                        int bytesLeidos;
                        while ((bytesLeidos = flujoEntrada.read(buffer)) != -1) {
                            String datos = new String(buffer, 0, bytesLeidos, StandardCharsets.UTF_8);
                            if (sesionWs.isOpen()) {
                                sesionWs.sendMessage(new TextMessage(datos));
                            }
                        }
                    } catch (IOException excepcion) {
                        log.debug("Hilo de lectura SSH finalizado: {}", excepcion.getMessage());
                    }
                }
            }, "ssh-reader-" + sesionWs.getId());

            hiloDeLectura.setDaemon(true);
            hiloDeLectura.start();
            hilosDeLectura.put(sesionWs.getId(), hiloDeLectura);

            String mensajeExito = objectMapper.writeValueAsString(
                    Map.of("tipo", "connected", "servidor", servidor.getNombre())
            );
            sesionWs.sendMessage(new TextMessage(mensajeExito));

        } catch (Exception excepcion) {
            log.error("Error al conectar SSH: {}", excepcion.getMessage());
            try {
                String mensajeLegible = traducirErrorConexion(excepcion);
                String mensajeError = objectMapper.writeValueAsString(
                        Map.of("tipo", "error", "mensaje", mensajeLegible)
                );
                sesionWs.sendMessage(new TextMessage(mensajeError));
            } catch (IOException ioExcepcion) {
                log.error("Error al enviar mensaje de error", ioExcepcion);
            }
        }
    }

    private String traducirErrorConexion(Exception excepcion) {
        String causaTextual = obtenerCausaRaiz(excepcion).toLowerCase();

        if (causaTextual.contains("unresolved") || causaTextual.contains("nodename") || causaTextual.contains("no such host")) {
            return "No se pudo resolver el nombre del servidor. Verifica la dirección IP o el dominio.";
        }
        if (causaTextual.contains("connection refused")) {
            return "Conexión rechazada. El servidor SSH no está escuchando en ese puerto.";
        }
        if (causaTextual.contains("timeout") || causaTextual.contains("timed out")) {
            return "Tiempo de espera agotado. El servidor no responde.";
        }
        if (causaTextual.contains("auth")) {
            return "Autenticación fallida. Revisa el usuario, la contraseña o la clave SSH.";
        }
        if (causaTextual.contains("network is unreachable") || causaTextual.contains("no route to host")) {
            return "Red inalcanzable. Comprueba la conectividad de red con el servidor.";
        }

        String mensaje = excepcion.getMessage();
        return mensaje != null ? mensaje : "Error desconocido al conectar.";
    }

    private String obtenerCausaRaiz(Throwable excepcion) {
        Throwable causa = excepcion;
        StringBuilder acumulado = new StringBuilder();
        while (causa != null) {
            if (causa.getMessage() != null) {
                acumulado.append(causa.getMessage()).append(" ");
            }
            acumulado.append(causa.getClass().getSimpleName()).append(" ");
            causa = causa.getCause();
        }
        return acumulado.toString();
    }

    private void manejarEntrada(WebSocketSession sesionWs, JsonNode json) throws IOException {
        OutputStream flujoSalida = (OutputStream) sesionWs.getAttributes().get(ATTR_OUTPUT_STREAM);
        if (flujoSalida == null) {
            return;
        }

        String datos = json.get("datos").asText();
        flujoSalida.write(datos.getBytes(StandardCharsets.UTF_8));
        flujoSalida.flush();
    }

    private void manejarRedimensionar(WebSocketSession sesionWs, JsonNode json) throws IOException {
        ChannelShell canalShell = (ChannelShell) sesionWs.getAttributes().get(ATTR_SSH_CHANNEL);
        if (canalShell == null) {
            return;
        }

        int columnas = json.get("columnas").asInt(80);
        int filas = json.get("filas").asInt(24);

        canalShell.sendWindowChange(columnas, filas);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession sesionWs, CloseStatus estado) {
        log.info("WebSocket cerrado: {}", sesionWs.getId());

        Thread hiloDeLectura = hilosDeLectura.remove(sesionWs.getId());
        if (hiloDeLectura != null) {
            hiloDeLectura.interrupt();
        }

        ChannelShell canalShell = (ChannelShell) sesionWs.getAttributes().get(ATTR_SSH_CHANNEL);
        if (canalShell != null && canalShell.isOpen()) {
            try {
                canalShell.close();
            } catch (IOException excepcion) {
                log.debug("Error al cerrar canal SSH", excepcion);
            }
        }

        ClientSession sesionSsh = (ClientSession) sesionWs.getAttributes().get(ATTR_SSH_SESSION);
        if (sesionSsh != null && sesionSsh.isOpen()) {
            try {
                sesionSsh.close();
            } catch (IOException excepcion) {
                log.debug("Error al cerrar sesion SSH", excepcion);
            }
        }

        SshClient cliente = (SshClient) sesionWs.getAttributes().get(ATTR_SSH_CLIENT);
        if (cliente != null) {
            cliente.stop();
        }
    }
}
