package com.autodeploy.repository;

import com.autodeploy.model.Notificacion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificacionRepository extends MongoRepository<Notificacion, String> {

	List<Notificacion> findByUsuarioIdOrderByFechaCreacionDesc(String usuarioId);

	Page<Notificacion> findByUsuarioIdOrderByFechaCreacionDesc(String usuarioId, Pageable pageable);

	List<Notificacion> findByUsuarioIdAndLeidaFalseOrderByFechaCreacionDesc(String usuarioId);

	long countByUsuarioIdAndLeidaFalse(String usuarioId);

	long deleteByUsuarioId(String usuarioId);
}
