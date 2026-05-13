package com.autodeploy.repository;

import com.autodeploy.model.Despliegue;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface DespliegueRepository extends MongoRepository<Despliegue, String> {

    List<Despliegue> findByServidorIdOrderByFechaInicioDesc(String servidorId);

    List<Despliegue> findTop20ByOrderByFechaInicioDesc();
}
