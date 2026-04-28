package com.autodeploy.repository;

import com.autodeploy.model.Servidor;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ServidorRepository extends MongoRepository<Servidor, String> {
}
