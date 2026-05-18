package com.autodeploy.repository;

import com.autodeploy.model.Backup;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface BackupRepository extends MongoRepository<Backup, String> {
    List<Backup> findByServidorIdOrderByFechaCreacionDesc(String servidorId);
}
