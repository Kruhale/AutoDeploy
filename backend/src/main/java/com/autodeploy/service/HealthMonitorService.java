package com.autodeploy.service;

import com.autodeploy.model.HealthCheck;
import com.autodeploy.model.Servidor;
import com.autodeploy.repository.HealthCheckRepository;
import com.autodeploy.repository.ServidorRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.net.InetSocketAddress;
import java.net.Socket;
import java.util.List;
import java.util.Optional;

@Service
public class HealthMonitorService {

    private final HealthCheckRepository healthCheckRepository;
    private final ServidorRepository servidorRepository;

    public HealthMonitorService(HealthCheckRepository healthCheckRepository, ServidorRepository servidorRepository) {
        this.healthCheckRepository = healthCheckRepository;
        this.servidorRepository = servidorRepository;
    }

    @Scheduled(fixedRate = 300000)
    public void ejecutarComprobaciones() {
        List<Servidor> listaDeServidores = servidorRepository.findAll();

        for (Servidor servidor : listaDeServidores) {
            HealthCheck comprobacion = comprobarServidor(servidor);
            healthCheckRepository.save(comprobacion);
        }
    }

    private HealthCheck comprobarServidor(Servidor servidor) {
        long tiempoInicio = System.currentTimeMillis();

        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(servidor.getDireccionIp(), servidor.getPuertoSsh()), 5000);
            long tiempoRespuesta = System.currentTimeMillis() - tiempoInicio;
            return new HealthCheck(servidor.getId(), servidor.getNombre(), "online", tiempoRespuesta, "Conexion exitosa");
        } catch (Exception excepcion) {
            long tiempoRespuesta = System.currentTimeMillis() - tiempoInicio;
            return new HealthCheck(servidor.getId(), servidor.getNombre(), "offline", tiempoRespuesta, excepcion.getMessage());
        }
    }

    public Optional<HealthCheck> obtenerEstado(String servidorId) {
        Optional<HealthCheck> ultimaComprobacion = healthCheckRepository.findTopByServidorIdOrderByFechaComprobacionDesc(servidorId);
        return ultimaComprobacion;
    }

    public List<HealthCheck> obtenerHistorial(String servidorId) {
        List<HealthCheck> historialDeComprobaciones = healthCheckRepository.findTop10ByServidorIdOrderByFechaComprobacionDesc(servidorId);
        return historialDeComprobaciones;
    }

    public List<HealthCheck> obtenerEstadoTodosLosServidores() {
        List<Servidor> listaDeServidores = servidorRepository.findAll();

        List<HealthCheck> listaDeUltimosEstados = listaDeServidores.stream()
                .map(servidor -> healthCheckRepository.findTopByServidorIdOrderByFechaComprobacionDesc(servidor.getId()))
                .filter(Optional::isPresent)
                .map(Optional::get)
                .toList();

        return listaDeUltimosEstados;
    }
}
