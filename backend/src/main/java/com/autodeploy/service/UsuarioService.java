package com.autodeploy.service;

import com.autodeploy.dto.LoginRequest;
import com.autodeploy.dto.LoginResponse;
import com.autodeploy.dto.RegistroRequest;
import com.autodeploy.exception.BadRequestException;
import com.autodeploy.exception.ResourceNotFoundException;
import com.autodeploy.model.Usuario;
import com.autodeploy.repository.ConfiguracionAsistenteIaRepository;
import com.autodeploy.repository.NotificacionRepository;
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
    private final NotificacionRepository notificacionRepository;
    private final ConfiguracionAsistenteIaRepository configuracionAsistenteRepository;

    public UsuarioService(
            UsuarioRepository usuarioRepository,
            PasswordEncoder passwordEncoder,
            JwtUtil jwtUtil,
            NotificacionRepository notificacionRepository,
            ConfiguracionAsistenteIaRepository configuracionAsistenteRepository) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.notificacionRepository = notificacionRepository;
        this.configuracionAsistenteRepository = configuracionAsistenteRepository;
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

        String tokenJwt = jwtUtil.generarToken(usuario.getId(), usuario.getEmail(), usuario.getRol());
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

    public java.util.List<Usuario> listarTodos() {
        return usuarioRepository.findAll();
    }

    public Usuario actualizarRol(String id, String nuevoRol) {
        if (!Usuario.ROL_USUARIO.equals(nuevoRol) && !Usuario.ROL_ADMIN.equals(nuevoRol)) {
            throw new BadRequestException("Rol inválido. Use USUARIO o ADMIN");
        }
        Usuario usuario = obtenerPorId(id);
        usuario.setRol(nuevoRol);
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

        notificacionRepository.deleteByUsuarioId(id);
        configuracionAsistenteRepository.deleteByUsuarioId(id);

        usuarioRepository.deleteById(id);
    }

    public com.autodeploy.model.ClaveSshUsuario agregarClaveSsh(String idUsuario, String nombre, String claveCompleta) {
        Usuario usuario = obtenerPorId(idUsuario);
        String huella = generarHuella(claveCompleta);
        String idClave = java.util.UUID.randomUUID().toString();

        com.autodeploy.model.ClaveSshUsuario nuevaClave = new com.autodeploy.model.ClaveSshUsuario(idClave, nombre, huella, claveCompleta);
        usuario.getClavesSsh().add(nuevaClave);
        usuarioRepository.save(usuario);
        return nuevaClave;
    }

    public void eliminarClaveSsh(String idUsuario, String idClave) {
        Usuario usuario = obtenerPorId(idUsuario);
        usuario.getClavesSsh().removeIf(c -> idClave.equals(c.getId()));
        usuarioRepository.save(usuario);
    }

    public com.autodeploy.model.PreferenciasNotificacion actualizarPreferenciasNotificacion(String idUsuario, com.autodeploy.model.PreferenciasNotificacion preferencias) {
        Usuario usuario = obtenerPorId(idUsuario);
        usuario.setPreferenciasNotificacion(preferencias);
        usuarioRepository.save(usuario);
        return preferencias;
    }

    private String generarHuella(String claveCompleta) {
        if (claveCompleta == null || claveCompleta.isBlank()) return "—";
        String[] partes = claveCompleta.trim().split("\\s+");
        if (partes.length < 2) return "SHA256:invalid";
        try {
            byte[] bytesClave = java.util.Base64.getDecoder().decode(partes[1]);
            byte[] hash = java.security.MessageDigest.getInstance("SHA-256").digest(bytesClave);
            String base64 = java.util.Base64.getEncoder().withoutPadding().encodeToString(hash);
            return "SHA256:" + base64.substring(0, Math.min(20, base64.length()));
        } catch (Exception ignorado) {
            return "SHA256:" + Integer.toHexString(claveCompleta.hashCode());
        }
    }

    public LoginResponse construirLoginResponse(Usuario usuario, String token) {
        return new LoginResponse(
            usuario.getId(),
            usuario.getNombre(),
            usuario.getEmail(),
            token,
            usuario.getPlan() != null ? usuario.getPlan() : "free",
            usuario.getFechaFinSuscripcion(),
            usuario.getIdioma()
        );
    }

    public Usuario actualizarIdioma(String id, String idioma) {
        boolean idiomaValido = idioma != null && java.util.Set.of("es", "en", "fr", "de", "it").contains(idioma);
        if (!idiomaValido) {
            throw new BadRequestException("Idioma no soportado");
        }
        Usuario usuario = obtenerPorId(id);
        usuario.setIdioma(idioma);
        return usuarioRepository.save(usuario);
    }
}
