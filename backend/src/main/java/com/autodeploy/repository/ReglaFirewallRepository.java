package com.autodeploy.repository;

import com.autodeploy.model.ReglaFirewall;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;

public interface ReglaFirewallRepository extends MongoRepository<ReglaFirewall, String> {

    List<ReglaFirewall> findByServidorId(String servidorId);

    void deleteByServidorIdAndPuerto(String servidorId, String puerto);

    // Reglas de tipo allow del servidor (las que abren puertos)
    @Query("{ 'servidorId': ?0, 'accion': 'allow' }")
    List<ReglaFirewall> findAllowsByServidor(String servidorId);

    long countByServidorId(String servidorId);
}
