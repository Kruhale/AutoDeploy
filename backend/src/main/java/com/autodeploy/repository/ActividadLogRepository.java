package com.autodeploy.repository;

import com.autodeploy.model.ActividadLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;

public interface ActividadLogRepository extends MongoRepository<ActividadLog, String> {

    List<ActividadLog> findTop20ByOrderByFechaCreacionDesc();

    Page<ActividadLog> findAllByOrderByFechaCreacionDesc(Pageable pageable);

    @Query("{ 'tipo': ?0 }")
    List<ActividadLog> findByTipo(String tipo);
}
