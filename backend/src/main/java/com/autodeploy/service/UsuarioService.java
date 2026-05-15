package com.autodeploy.service;

import com.autodeploy.dto.LoginRequest;
import com.autodeploy.dto.LoginResponse;
import com.autodeploy.dto.RegistroRequest;
import com.autodeploy.exception.BadRequestException;
import com.autodeploy.exception.ResourceNotFoundException;
import com.autodeploy.model.Usuario;
import com.autodeploy.repository.UsuarioRepository;
import com.autodeploy.util.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public UsuarioService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
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

        String tokenJwt = jwtUtil.generarToken(usuario.getId(), usuario.getEmail());
        return construirLoginResponse(usuario, tokenJwt);
    }

    public Usuario obtenerPorId(String id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
    }

    public Usuario actualizar(String id, String nombre, String email) {
        Usuario usuario = obtenerPorId(id);
        usuario.setNombre(nombre);
        usuario.setEmail(email);
        return usuarioRepository.save(usuario);
    }

    public Usuario actualizarPlan(String id, String plan) {
        Usuario usuario = obtenerPorId(id);
        usuario.setPlan(plan);
        usuario.setFechaInicioSuscripcion(LocalDateTime.now());
        usuario.setFechaFinSuscripcion(null);
        return usuarioRepository.save(usuario);
    }

    public Usuario cancelarSuscripcion(String id) {
        Usuario usuario = obtenerPorId(id);

        LocalDateTime fechaInicio = usuario.getFechaInicioSuscripcion();
        if (fechaInicio == null) {
            fechaInicio = LocalDateTime.now();
        }
        LocalDateTime fechaFin = fechaInicio.plusMonths(1);

        usuario.setFechaFinSuscripcion(fechaFin);
        return usuarioRepository.save(usuario);
    }

    public void eliminar(String id) {
        boolean existe = usuarioRepository.existsById(id);
        if (!existe) {
            throw new ResourceNotFoundException("Usuario no encontrado");
        }
        usuarioRepository.deleteById(id);
    }

    public LoginResponse construirLoginResponse(Usuario usuario, String token) {
        return new LoginResponse(
            usuario.getId(),
            usuario.getNombre(),
            usuario.getEmail(),
            token,
            usuario.getPlan() != null ? usuario.getPlan() : "free",
            usuario.getFechaFinSuscripcion()
        );
    }
}
