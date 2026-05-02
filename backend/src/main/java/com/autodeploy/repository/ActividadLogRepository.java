package com.autodeploy.repository;

import com.autodeploy.model.ActividadLog;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ActividadLogRepository extends MongoRepository<ActividadLog, String> {

    List<ActividadLog> findTop20ByOrderByFechaCreacionDesc();
}
