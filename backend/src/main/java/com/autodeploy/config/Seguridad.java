package com.autodeploy.config;

import com.autodeploy.repository.ServidorRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

/**
 * Helper para usar dentro de @PreAuthorize via SpEL.
 * Comprueba si el usuario autenticado es dueño del recurso que pide.
 * Se registra como bean "seguridad" para que se referencie como @seguridad.X(...) en las anotaciones.
 */
@Component("seguridad")
public class Seguridad {

    private final ServidorRepository servidorRepository;

    public Seguridad(ServidorRepository servidorRepository) {
        this.servidorRepository = servidorRepository;
    }

    /** El servidor con ese id pertenece al usuario autenticado */
    public boolean esDuenioDelServidor(String servidorId, Authentication autenticacion) {
        if (autenticacion == null || servidorId == null) {
            return false;
        }
        String usuarioId = extraerUsuarioId(autenticacion);
        if (usuarioId == null) {
            return false;
        }
        return servidorRepository.findByIdAndUsuarioId(servidorId, usuarioId).isPresent();
    }

    /** El id del path coincide con el usuario autenticado (para endpoints de tipo /usuarios/{id}) */
    public boolean esElMismoUsuario(String usuarioIdDelPath, Authentication autenticacion) {
        if (autenticacion == null || usuarioIdDelPath == null) {
            return false;
        }
        String usuarioIdAutenticado = extraerUsuarioId(autenticacion);
        return usuarioIdDelPath.equals(usuarioIdAutenticado);
    }

    public boolean esAdmin(Authentication autenticacion) {
        if (autenticacion == null) {
            return false;
        }
        for (GrantedAuthority autoridad : autenticacion.getAuthorities()) {
            if ("ROLE_ADMIN".equals(autoridad.getAuthority())) {
                return true;
            }
        }
        return false;
    }

    private static String extraerUsuarioId(Authentication autenticacion) {
        // getName() funciona tanto si principal es String (JWT real) como si es UserDetails (tests con .with(user()))
        return autenticacion.getName();
    }
}
