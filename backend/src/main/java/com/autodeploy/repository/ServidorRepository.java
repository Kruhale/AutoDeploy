package com.autodeploy.repository;

import com.autodeploy.model.Servidor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ServidorRepository extends MongoRepository<Servidor, String> {

    List<Servidor> findByUsuarioId(String usuarioId);

    Page<Servidor> findByUsuarioId(String usuarioId, Pageable pageable);

    Optional<Servidor> findByIdAndUsuarioId(String id, String usuarioId);

    @Query(value = "{ 'usuarioId': ?0, 'estado': ?1 }")
    List<Servidor> findByUsuarioIdAndEstado(String usuarioId, String estado);

    long countByUsuarioId(String usuarioId);
}
