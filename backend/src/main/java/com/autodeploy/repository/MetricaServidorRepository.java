package com.autodeploy.repository;

import com.autodeploy.model.MetricaServidor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface MetricaServidorRepository extends MongoRepository<MetricaServidor, String> {

    Optional<MetricaServidor> findTopByServidorIdOrderByFechaMedicionDesc(String servidorId);

    Page<MetricaServidor> findByServidorIdOrderByFechaMedicionDesc(String servidorId, Pageable pageable);

    // Metricas de un servidor entre dos fechas (util para graficar el historial)
    @Query("{ 'servidorId': ?0, 'fechaMedicion': { '$gte': ?1, '$lte': ?2 } }")
    List<MetricaServidor> findByServidorIdEntreFechas(String servidorId, LocalDateTime desde, LocalDateTime hasta);

    // Servidores con CPU saturada (>80%) en la ultima medicion
    @Query("{ 'cpuPorcentaje': { '$gt': ?0 } }")
    List<MetricaServidor> findConCpuMayorQue(double porcentajeUmbral);

    long countByServidorId(String servidorId);
}
