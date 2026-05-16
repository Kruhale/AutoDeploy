package com.autodeploy.repository;

import com.autodeploy.model.ConfiguracionAsistenteIa;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface ConfiguracionAsistenteIaRepository extends MongoRepository<ConfiguracionAsistenteIa, String> {
    Optional<ConfiguracionAsistenteIa> findByUsuarioId(String usuarioId);
}
