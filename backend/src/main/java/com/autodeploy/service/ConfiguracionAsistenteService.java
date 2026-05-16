package com.autodeploy.service;

import com.autodeploy.dto.ConfiguracionAsistenteRequest;
import com.autodeploy.dto.ConfiguracionAsistenteResponse;
import com.autodeploy.model.ConfiguracionAsistenteIa;
import com.autodeploy.repository.ConfiguracionAsistenteIaRepository;
import com.autodeploy.util.CifradoUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class ConfiguracionAsistenteService {

    private final ConfiguracionAsistenteIaRepository configuracionRepository;

    @Value("${autodeploy.cifrado.clave}")
    private String claveCifrado;

    public ConfiguracionAsistenteService(ConfiguracionAsistenteIaRepository configuracionRepository) {
        this.configuracionRepository = configuracionRepository;
    }

    public ConfiguracionAsistenteIa obtenerOCrear(String usuarioId) {
        Optional<ConfiguracionAsistenteIa> configuracionExistente = configuracionRepository.findByUsuarioId(usuarioId);

        if (configuracionExistente.isPresent()) {
            return configuracionExistente.get();
        }

        ConfiguracionAsistenteIa nuevaConfiguracion = new ConfiguracionAsistenteIa();
        nuevaConfiguracion.setUsuarioId(usuarioId);
        ConfiguracionAsistenteIa configuracionGuardada = configuracionRepository.save(nuevaConfiguracion);
        return configuracionGuardada;
    }

    public ConfiguracionAsistenteResponse obtenerResumen(String usuarioId) {
        ConfiguracionAsistenteIa configuracion = obtenerOCrear(usuarioId);

        boolean tieneApiKey = configuracion.getApiKeyCifrada() != null && !configuracion.getApiKeyCifrada().isBlank();
        List<String> listaComandos = configuracion.getComandosAutoAprobados();

        if (listaComandos == null) {
            listaComandos = new ArrayList<>();
        }

        ConfiguracionAsistenteResponse resumen = new ConfiguracionAsistenteResponse(tieneApiKey, configuracion.getModeloPreferido(), listaComandos);
        return resumen;
    }

    public ConfiguracionAsistenteResponse actualizar(String usuarioId, ConfiguracionAsistenteRequest peticion) {
        ConfiguracionAsistenteIa configuracion = obtenerOCrear(usuarioId);

        if (peticion.apiKey() != null && !peticion.apiKey().isBlank()) {
            String apiKeyCifrada = CifradoUtil.cifrar(peticion.apiKey(), claveCifrado);
            configuracion.setApiKeyCifrada(apiKeyCifrada);
        }

        if (peticion.modeloPreferido() != null && !peticion.modeloPreferido().isBlank()) {
            configuracion.setModeloPreferido(peticion.modeloPreferido());
        }

        if (peticion.comandosAutoAprobados() != null) {
            configuracion.setComandosAutoAprobados(peticion.comandosAutoAprobados());
        }

        configuracion.setFechaActualizacion(LocalDateTime.now());
        ConfiguracionAsistenteIa configuracionGuardada = configuracionRepository.save(configuracion);

        ConfiguracionAsistenteResponse resumen = obtenerResumen(configuracionGuardada.getUsuarioId());
        return resumen;
    }

    public String obtenerApiKeyDescifrada(String usuarioId) {
        ConfiguracionAsistenteIa configuracion = obtenerOCrear(usuarioId);

        if (configuracion.getApiKeyCifrada() == null || configuracion.getApiKeyCifrada().isBlank()) {
            return null;
        }

        String apiKeyDescifrada = CifradoUtil.descifrar(configuracion.getApiKeyCifrada(), claveCifrado);
        return apiKeyDescifrada;
    }

    public boolean estaAutoAprobado(String comando, List<String> patronesAutoAprobados) {
        if (patronesAutoAprobados == null || patronesAutoAprobados.isEmpty()) {
            return false;
        }

        String comandoNormalizado = comando.trim();
        for (String patron : patronesAutoAprobados) {
            String patronNormalizado = patron.trim();
            if (comandoNormalizado.startsWith(patronNormalizado)) {
                return true;
            }
        }

        return false;
    }
}
