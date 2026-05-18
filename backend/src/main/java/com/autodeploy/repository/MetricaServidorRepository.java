package com.autodeploy.repository;

import com.autodeploy.model.MetricaServidor;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface MetricaServidorRepository extends MongoRepository<MetricaServidor, String> {

    Optional<MetricaServidor> findTopByServidorIdOrderByFechaMedicionDesc(String servidorId);
}
