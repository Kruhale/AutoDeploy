package com.autodeploy.repository;

import com.autodeploy.model.Backup;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;

public interface BackupRepository extends MongoRepository<Backup, String> {

    List<Backup> findByServidorIdOrderByFechaCreacionDesc(String servidorId);

    Page<Backup> findByServidorIdOrderByFechaCreacionDesc(String servidorId, Pageable pageable);

    long countByServidorId(String servidorId);

    @Query("{ 'servidorId': ?0, 'tipo': ?1 }")
    List<Backup> findByServidorIdAndTipo(String servidorId, String tipo);
}
