package com.autodeploy.service;

import com.autodeploy.model.MetricaServidor;
import com.autodeploy.model.Servidor;
import com.autodeploy.repository.MetricaServidorRepository;
import com.autodeploy.repository.ServidorRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
public class MonitorMetricasService {

    private static final Logger LOGGER = LoggerFactory.getLogger(MonitorMetricasService.class);

    private static final String COMANDO_RECOLECCION =
            "echo '===CPU===' && (top -bn1 2>/dev/null | grep -i 'cpu(s)' | awk '{print $2+$4}' || echo 0) && " +
            "echo '===RAM===' && (free -m 2>/dev/null | awk 'NR==2{print $3\" \"$2}' || echo '0 0') && " +
            "echo '===DISCO===' && (df -h / 2>/dev/null | awk 'NR==2{gsub(\"%\",\"\",$5); print $3\" \"$2\" \"$5}' || echo '0 0 0') && " +
            "echo '===CARGA===' && (uptime 2>/dev/null | awk -F'load average:' '{print $2}' | awk -F',' '{print $1}' | tr -d ' ' || echo 0) && " +
            "echo '===UPTIME===' && (awk '{print int($1)}' /proc/uptime 2>/dev/null || echo 0) && " +
            "echo '===NGINX===' && (ls /etc/nginx/sites-enabled 2>/dev/null | grep -v default || echo '') && " +
            "echo '===DOCKER===' && (docker ps --format '{{.Names}}' 2>/dev/null || echo '') && " +
            "echo '===FIN==='";

    private final ServidorRepository servidorRepository;
    private final MetricaServidorRepository metricaServidorRepository;
    private final GestorSesionesSshService gestorSesionesSshService;
    private final MetricasWebSocketHandler metricasWebSocketHandler;
    private final ReconexionService reconexionService;

    public MonitorMetricasService(
            ServidorRepository servidorRepository,
            MetricaServidorRepository metricaServidorRepository,
            GestorSesionesSshService gestorSesionesSshService,
            MetricasWebSocketHandler metricasWebSocketHandler,
            ReconexionService reconexionService) {
        this.servidorRepository = servidorRepository;
        this.metricaServidorRepository = metricaServidorRepository;
        this.gestorSesionesSshService = gestorSesionesSshService;
        this.metricasWebSocketHandler = metricasWebSocketHandler;
        this.reconexionService = reconexionService;
    }

    @Scheduled(fixedDelay = 30000, initialDelay = 10000)
    public void recolectarMetricasDeTodos() {
        List<Servidor> listaServidores = servidorRepository.findAll();
        if (listaServidores.isEmpty()) {
            return;
        }
        LOGGER.debug("Recolectando metricas de {} servidores", listaServidores.size());
        for (Servidor servidor : listaServidores) {
            recolectarParaServidor(servidor);
        }
    }

    public MetricaServidor recolectarParaServidor(Servidor servidor) {
        MetricaServidor metricaResultado = new MetricaServidor();
        metricaResultado.setServidorId(servidor.getId());

        boolean conexionFunciono;
        try {
            String salidaCruda = gestorSesionesSshService.ejecutar(servidor.getId(), COMANDO_RECOLECCION);
            rellenarDesdeSalida(metricaResultado, salidaCruda);
            metricaResultado.setSesionActiva(true);
            conexionFunciono = true;
        } catch (Exception excepcionRecoleccion) {
            LOGGER.warn("No se pudo recolectar metricas de {} ({}): {}",
                    servidor.getNombre(), servidor.getDireccionIp(), excepcionRecoleccion.getMessage());
            metricaResultado.setSesionActiva(false);
            conexionFunciono = false;
        }

        reconexionService.anotarPing(servidor, conexionFunciono);

        MetricaServidor metricaGuardada = metricaServidorRepository.save(metricaResultado);
        metricasWebSocketHandler.difundirMetrica(metricaGuardada);
        return metricaGuardada;
    }

    private void rellenarDesdeSalida(MetricaServidor metrica, String salidaCompleta) {
        String bloqueCpu = extraerBloque(salidaCompleta, "===CPU===", "===RAM===");
        String bloqueRam = extraerBloque(salidaCompleta, "===RAM===", "===DISCO===");
        String bloqueDisco = extraerBloque(salidaCompleta, "===DISCO===", "===CARGA===");
        String bloqueCarga = extraerBloque(salidaCompleta, "===CARGA===", "===UPTIME===");
        String bloqueUptime = extraerBloque(salidaCompleta, "===UPTIME===", "===NGINX===");
        String bloqueNginx = extraerBloque(salidaCompleta, "===NGINX===", "===DOCKER===");
        String bloqueDocker = extraerBloque(salidaCompleta, "===DOCKER===", "===FIN===");

        metrica.setCpuPorcentaje(parsearDoubleSeguro(bloqueCpu));
        rellenarMemoria(metrica, bloqueRam);
        rellenarDisco(metrica, bloqueDisco);
        metrica.setCargaPromedio(parsearDoubleSeguro(bloqueCarga));
        metrica.setTiempoEncendidoSegundos(parsearLongSeguro(bloqueUptime));
        metrica.setWebDesplegadas(parsearListaLineas(bloqueNginx));
        metrica.setContainersDocker(parsearListaLineas(bloqueDocker));
    }

    private void rellenarMemoria(MetricaServidor metrica, String bloque) {
        String textoLimpio = bloque.trim();
        if (textoLimpio.isEmpty()) {
            return;
        }
        String[] partes = textoLimpio.split("\\s+");
        if (partes.length < 2) {
            return;
        }
        metrica.setRamUsadaMb(parsearLongSeguro(partes[0]));
        metrica.setRamTotalMb(parsearLongSeguro(partes[1]));
    }

    private void rellenarDisco(MetricaServidor metrica, String bloque) {
        String textoLimpio = bloque.trim();
        if (textoLimpio.isEmpty()) {
            return;
        }
        String[] partes = textoLimpio.split("\\s+");
        if (partes.length < 3) {
            return;
        }
        long discoUsado = parsearTamanoAGigas(partes[0]);
        long discoTotal = parsearTamanoAGigas(partes[1]);
        int porcentajeUso = (int) parsearLongSeguro(partes[2]);
        metrica.setDiscoUsadoGb(discoUsado);
        metrica.setDiscoTotalGb(discoTotal);
        metrica.setDiscoUsadoPorcentaje(porcentajeUso);
    }

    private long parsearTamanoAGigas(String texto) {
        String textoLimpio = texto.trim();
        if (textoLimpio.isEmpty()) {
            return 0L;
        }
        char unidad = textoLimpio.charAt(textoLimpio.length() - 1);
        if (!Character.isLetter(unidad)) {
            return parsearLongSeguro(textoLimpio);
        }
        String soloNumero = textoLimpio.substring(0, textoLimpio.length() - 1);
        double cantidad = parsearDoubleSeguro(soloNumero);
        if (unidad == 'T') {
            return (long) (cantidad * 1024);
        }
        if (unidad == 'M') {
            return (long) (cantidad / 1024);
        }
        if (unidad == 'K') {
            return 0L;
        }
        return (long) cantidad;
    }

    private List<String> parsearListaLineas(String bloque) {
        List<String> listaLineas = new ArrayList<>();
        String[] lineas = bloque.split("\n");
        List<String> lineasLista = Arrays.asList(lineas);
        for (String linea : lineasLista) {
            String lineaLimpia = linea.trim();
            if (!lineaLimpia.isEmpty()) {
                listaLineas.add(lineaLimpia);
            }
        }
        return listaLineas;
    }

    private String extraerBloque(String texto, String marcadorInicio, String marcadorFin) {
        int indiceInicio = texto.indexOf(marcadorInicio);
        int indiceFin = texto.indexOf(marcadorFin);
        if (indiceInicio < 0 || indiceFin < 0 || indiceFin <= indiceInicio) {
            return "";
        }
        String fragmento = texto.substring(indiceInicio + marcadorInicio.length(), indiceFin);
        return fragmento.trim();
    }

    private double parsearDoubleSeguro(String texto) {
        try {
            String textoLimpio = texto.trim();
            if (textoLimpio.isEmpty()) {
                return 0.0;
            }
            return Double.parseDouble(textoLimpio);
        } catch (NumberFormatException excepcionFormato) {
            return 0.0;
        }
    }

    private long parsearLongSeguro(String texto) {
        try {
            String textoLimpio = texto.trim();
            if (textoLimpio.isEmpty()) {
                return 0L;
            }
            return Long.parseLong(textoLimpio);
        } catch (NumberFormatException excepcionFormato) {
            return 0L;
        }
    }
}
