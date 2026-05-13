package com.autodeploy.repository;

import com.autodeploy.model.HealthCheck;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface HealthCheckRepository extends MongoRepository<HealthCheck, String> {

    List<HealthCheck> findTop10ByServidorIdOrderByFechaComprobacionDesc(String servidorId);

    Optional<HealthCheck> findTopByServidorIdOrderByFechaComprobacionDesc(String servidorId);
}
