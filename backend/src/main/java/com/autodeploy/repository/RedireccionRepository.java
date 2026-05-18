package com.autodeploy.repository;

import com.autodeploy.model.Redireccion;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface RedireccionRepository extends MongoRepository<Redireccion, String> {
    List<Redireccion> findByServidorId(String servidorId);
}
