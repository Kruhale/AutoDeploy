package com.autodeploy.service;

import com.autodeploy.exception.ResourceNotFoundException;
import com.autodeploy.model.Subdominio;
import com.autodeploy.repository.SubdominioRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SubdominioService {

    private final SubdominioRepository subdominioRepository;

    public SubdominioService(SubdominioRepository subdominioRepository) {
        this.subdominioRepository = subdominioRepository;
    }

    public Subdominio registrar(String servidorId, String nombre, String tipo, String destino) {
        Subdominio nuevoSubdominio = new Subdominio();
        nuevoSubdominio.setServidorId(servidorId);
        nuevoSubdominio.setNombre(nombre);
        nuevoSubdominio.setTipo(tipo);
        nuevoSubdominio.setDestino(destino);

        Subdominio subdominioGuardado = subdominioRepository.save(nuevoSubdominio);
        return subdominioGuardado;
    }

    public List<Subdominio> listarPorServidor(String servidorId) {
        List<Subdominio> listaDeSubdominios = subdominioRepository.findByServidorId(servidorId);
        return listaDeSubdominios;
    }

    public void eliminar(String id) {
        boolean existe = subdominioRepository.existsById(id);
        if (!existe) {
            throw new ResourceNotFoundException("Subdominio no encontrado");
        }
        subdominioRepository.deleteById(id);
    }
}
