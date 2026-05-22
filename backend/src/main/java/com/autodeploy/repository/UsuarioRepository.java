package com.autodeploy.repository;

import com.autodeploy.model.Usuario;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UsuarioRepository extends MongoRepository<Usuario, String> {

    Optional<Usuario> findByEmail(String email);

    boolean existsByEmail(String email);

    long countByPlan(String plan);

    @Query("{ 'rol': ?0 }")
    List<Usuario> findByRol(String rol);

    @Query("{ 'plan': { '$in': [?0, ?1] } }")
    List<Usuario> findByPlanIn(String plan1, String plan2);

    // Usuarios con suscripcion vencida (fechaFinSuscripcion < ahora)
    @Query("{ 'fechaFinSuscripcion': { '$ne': null, '$lt': ?0 } }")
    List<Usuario> findConSuscripcionVencidaAntesDe(java.time.LocalDateTime fecha);
}
