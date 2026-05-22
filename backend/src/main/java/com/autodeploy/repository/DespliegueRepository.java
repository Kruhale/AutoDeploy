package com.autodeploy.repository;

import com.autodeploy.model.Despliegue;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface DespliegueRepository extends MongoRepository<Despliegue, String> {

    List<Despliegue> findByServidorIdOrderByFechaInicioDesc(String servidorId);

    Page<Despliegue> findByServidorIdOrderByFechaInicioDesc(String servidorId, Pageable pageable);

    List<Despliegue> findTop20ByOrderByFechaInicioDesc();

    Page<Despliegue> findAllByOrderByFechaInicioDesc(Pageable pageable);

    // Para que el usuario vea solo despliegues de SUS servidores.
    List<Despliegue> findTop20ByServidorIdInOrderByFechaInicioDesc(List<String> servidorIds);

    Page<Despliegue> findByServidorIdInOrderByFechaInicioDesc(List<String> servidorIds, Pageable pageable);

    Optional<Despliegue> findByTokenWebhook(String tokenWebhook);

    @Query("{ 'estado': ?0 }")
    List<Despliegue> findByEstado(String estado);
}
