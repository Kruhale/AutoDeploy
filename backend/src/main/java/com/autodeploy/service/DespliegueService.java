package com.autodeploy.service;

import com.autodeploy.exception.ResourceNotFoundException;
import com.autodeploy.model.Despliegue;
import com.autodeploy.repository.DespliegueRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

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

    public Page<Despliegue> obtenerHistorialPaginado(Pageable pageable) {
        return despliegueRepository.findAllByOrderByFechaInicioDesc(pageable);
    }

    public List<Despliegue> obtenerPorServidor(String servidorId) {
        List<Despliegue> listaDeDesplieguesDelServidor = despliegueRepository.findByServidorIdOrderByFechaInicioDesc(servidorId);
        return listaDeDesplieguesDelServidor;
    }

    public Page<Despliegue> obtenerPorServidorPaginado(String servidorId, Pageable pageable) {
        return despliegueRepository.findByServidorIdOrderByFechaInicioDesc(servidorId, pageable);
    }

    public Despliegue obtenerPorId(String id) {
        return despliegueRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Despliegue no encontrado"));
    }

    public Optional<Despliegue> buscarPorTokenWebhook(String tokenWebhook) {
        return despliegueRepository.findByTokenWebhook(tokenWebhook);
    }

    public Despliegue actualizarMetadatosGit(String id, String tecnologia, String rama, String directorioRemoto, String tokenWebhook) {
        Despliegue despliegue = obtenerPorId(id);
        despliegue.setTecnologia(tecnologia);
        despliegue.setRama(rama);
        despliegue.setDirectorioRemoto(directorioRemoto);
        despliegue.setTokenWebhook(tokenWebhook);
        return despliegueRepository.save(despliegue);
    }

    public String generarTokenWebhook() {
        SecureRandom generador = new SecureRandom();
        byte[] bytesAleatorios = new byte[24];
        generador.nextBytes(bytesAleatorios);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytesAleatorios);
    }
}
