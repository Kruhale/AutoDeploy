package com.autodeploy.repository;

import com.autodeploy.model.Subdominio;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SubdominioRepository extends MongoRepository<Subdominio, String> {
    List<Subdominio> findByServidorId(String servidorId);
}
