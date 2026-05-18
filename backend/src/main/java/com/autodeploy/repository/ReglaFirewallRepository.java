package com.autodeploy.repository;

import com.autodeploy.model.ReglaFirewall;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ReglaFirewallRepository extends MongoRepository<ReglaFirewall, String> {
    List<ReglaFirewall> findByServidorId(String servidorId);
    void deleteByServidorIdAndPuerto(String servidorId, String puerto);
}
