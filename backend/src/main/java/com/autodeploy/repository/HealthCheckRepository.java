package com.autodeploy.repository;

import com.autodeploy.model.HealthCheck;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface HealthCheckRepository extends MongoRepository<HealthCheck, String> {

    List<HealthCheck> findTop10ByServidorIdOrderByFechaComprobacionDesc(String servidorId);

    Optional<HealthCheck> findTopByServidorIdOrderByFechaComprobacionDesc(String servidorId);

    // Servidores que han estado offline en algun check (para alertar al usuario)
    @Query("{ 'estado': 'offline' }")
    List<HealthCheck> findTodosLosOffline();

    long countByServidorIdAndEstado(String servidorId, String estado);
}
