package com.autodeploy.service;

import com.autodeploy.dto.LoginRequest;
import com.autodeploy.dto.LoginResponse;
import com.autodeploy.dto.RegistroRequest;
import com.autodeploy.exception.BadRequestException;
import com.autodeploy.exception.ResourceNotFoundException;
import com.autodeploy.model.Usuario;
import com.autodeploy.repository.UsuarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public Usuario registrar(RegistroRequest peticion) {
        boolean emailExiste = usuarioRepository.existsByEmail(peticion.email());
        if (emailExiste) {
            throw new BadRequestException("Ya existe un usuario con ese email");
        }

        String hashPassword = passwordEncoder.encode(peticion.password());

        Usuario nuevoUsuario = new Usuario(peticion.nombre(), peticion.email(), hashPassword);

        Usuario usuarioGuardado = usuarioRepository.save(nuevoUsuario);
        return usuarioGuardado;
    }

    public LoginResponse login(LoginRequest peticion) {
        Usuario usuario = usuarioRepository.findByEmail(peticion.email())
                .orElseThrow(() -> new BadRequestException("Email o password incorrectos"));

        boolean passwordCorrecta = passwordEncoder.matches(peticion.password(), usuario.getPasswordHash());
        if (!passwordCorrecta) {
            throw new BadRequestException("Email o password incorrectos");
        }

        LoginResponse respuesta = new LoginResponse(usuario.getId(), usuario.getNombre(), usuario.getEmail());
        return respuesta;
    }

    public Usuario obtenerPorId(String id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        return usuario;
    }

    public Usuario actualizar(String id, String nombre, String email) {
        Usuario usuario = obtenerPorId(id);
        usuario.setNombre(nombre);
        usuario.setEmail(email);

        Usuario usuarioActualizado = usuarioRepository.save(usuario);
        return usuarioActualizado;
    }

    public void eliminar(String id) {
        boolean existe = usuarioRepository.existsById(id);
        if (!existe) {
            throw new ResourceNotFoundException("Usuario no encontrado");
        }
        usuarioRepository.deleteById(id);
    }
}
