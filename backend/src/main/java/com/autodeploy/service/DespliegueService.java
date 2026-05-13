package com.autodeploy.service;

import com.autodeploy.exception.ResourceNotFoundException;
import com.autodeploy.model.Despliegue;
import com.autodeploy.repository.DespliegueRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class DespliegueService {

    private final DespliegueRepository despliegueRepository;

    public DespliegueService(DespliegueRepository despliegueRepository) {
        this.despliegueRepository = despliegueRepository;
    }

    public Despliegue registrar(String servidorId, String tipo, String url) {
        Despliegue nuevoDespliegue = new Despliegue(servidorId, tipo, url);
        Despliegue despliegueGuardado = despliegueRepository.save(nuevoDespliegue);
        return despliegueGuardado;
    }

    public Despliegue completar(String id, String mensaje) {
        Despliegue despliegue = despliegueRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Despliegue no encontrado"));

        despliegue.setEstado("completado");
        despliegue.setMensaje(mensaje);
        despliegue.setFechaFin(LocalDateTime.now());

        Despliegue despliegueActualizado = despliegueRepository.save(despliegue);
        return despliegueActualizado;
    }

    public Despliegue fallar(String id, String mensaje) {
        Despliegue despliegue = despliegueRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Despliegue no encontrado"));

        despliegue.setEstado("fallido");
        despliegue.setMensaje(mensaje);
        despliegue.setFechaFin(LocalDateTime.now());

        Despliegue despliegueActualizado = despliegueRepository.save(despliegue);
        return despliegueActualizado;
    }

    public List<Despliegue> obtenerHistorial() {
        List<Despliegue> listaDeDesplieguesRecientes = despliegueRepository.findTop20ByOrderByFechaInicioDesc();
        return listaDeDesplieguesRecientes;
    }

    public List<Despliegue> obtenerPorServidor(String servidorId) {
        List<Despliegue> listaDeDesplieguesDelServidor = despliegueRepository.findByServidorIdOrderByFechaInicioDesc(servidorId);
        return listaDeDesplieguesDelServidor;
    }
}
