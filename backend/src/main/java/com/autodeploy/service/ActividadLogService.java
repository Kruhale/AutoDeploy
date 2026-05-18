package com.autodeploy.service;

import com.autodeploy.model.ActividadLog;
import com.autodeploy.repository.ActividadLogRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ActividadLogService {

    private final ActividadLogRepository actividadLogRepository;

    public ActividadLogService(ActividadLogRepository actividadLogRepository) {
        this.actividadLogRepository = actividadLogRepository;
    }

    public void registrar(String tipo, String mensaje, String icono) {
        ActividadLog nuevaActividad = new ActividadLog(tipo, mensaje, icono);
        actividadLogRepository.save(nuevaActividad);
    }

    public List<ActividadLog> obtenerRecientes() {
        List<ActividadLog> listaDeActividadesRecientes = actividadLogRepository.findTop20ByOrderByFechaCreacionDesc();
        return listaDeActividadesRecientes;
    }
}
