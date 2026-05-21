package com.autodeploy.controller;

import com.autodeploy.dto.ApiResponse;
import com.autodeploy.dto.LoginRequest;
import com.autodeploy.dto.LoginResponse;
import com.autodeploy.dto.RegistroRequest;
import com.autodeploy.model.ClaveSshUsuario;
import com.autodeploy.model.PreferenciasNotificacion;
import com.autodeploy.model.Usuario;
import com.autodeploy.service.UsuarioService;

import java.util.List;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.Map;

@Tag(name = "Usuarios", description = "Gestión de usuarios y autenticación")
@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final UsuarioService usuarioService;

    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @Operation(summary = "Registrar usuario")
    @PostMapping("/registro")
    public ResponseEntity<ApiResponse<LoginResponse>> registrar(@RequestBody @Valid RegistroRequest peticion) {
        Usuario usuario = usuarioService.registrar(peticion);
        LoginResponse respuesta = usuarioService.construirLoginResponse(usuario, null);
        URI ubicacion = URI.create("/api/usuarios/" + usuario.getId());

        ApiResponse<LoginResponse> cuerpo = new ApiResponse<>(true, "Usuario registrado", respuesta);
        return ResponseEntity.created(ubicacion).body(cuerpo);
    }

    @Operation(summary = "Login")
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@RequestBody @Valid LoginRequest peticion) {
        LoginResponse respuesta = usuarioService.login(peticion);

        ApiResponse<LoginResponse> cuerpo = new ApiResponse<>(true, "Login correcto", respuesta);
        return ResponseEntity.ok(cuerpo);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<LoginResponse>> obtener(@PathVariable String id) {
        Usuario usuario = usuarioService.obtenerPorId(id);
        LoginResponse respuesta = usuarioService.construirLoginResponse(usuario, null);

        ApiResponse<LoginResponse> cuerpo = new ApiResponse<>(true, "OK", respuesta);
        return ResponseEntity.ok(cuerpo);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<LoginResponse>> actualizar(
            @PathVariable String id,
            @RequestBody Map<String, String> datos) {
        String nombre = datos.getOrDefault("nombre", "");
        String email = datos.getOrDefault("email", "");

        Usuario usuario = usuarioService.actualizar(id, nombre, email);
        LoginResponse respuesta = usuarioService.construirLoginResponse(usuario, null);

        ApiResponse<LoginResponse> cuerpo = new ApiResponse<>(true, "Perfil actualizado", respuesta);
        return ResponseEntity.ok(cuerpo);
    }

    @PutMapping("/{id}/plan")
    public ResponseEntity<ApiResponse<LoginResponse>> actualizarPlan(
            @PathVariable String id,
            @RequestBody Map<String, String> datos) {
        String plan = datos.getOrDefault("plan", "free");

        Usuario usuario = usuarioService.actualizarPlan(id, plan);
        LoginResponse respuesta = usuarioService.construirLoginResponse(usuario, null);

        ApiResponse<LoginResponse> cuerpo = new ApiResponse<>(true, "Plan actualizado", respuesta);
        return ResponseEntity.ok(cuerpo);
    }

    @PutMapping("/{id}/cancelar-suscripcion")
    public ResponseEntity<ApiResponse<LoginResponse>> cancelarSuscripcion(@PathVariable String id) {
        Usuario usuario = usuarioService.cancelarSuscripcion(id);
        LoginResponse respuesta = usuarioService.construirLoginResponse(usuario, null);

        ApiResponse<LoginResponse> cuerpo = new ApiResponse<>(true, "Suscripción cancelada", respuesta);
        return ResponseEntity.ok(cuerpo);
    }

    @Operation(summary = "Actualizar idioma preferido del usuario")
    @PutMapping("/{id}/idioma")
    public ResponseEntity<ApiResponse<LoginResponse>> actualizarIdioma(
            @PathVariable String id,
            @RequestBody Map<String, String> datos) {
        String idioma = datos.getOrDefault("idioma", "es");

        Usuario usuario = usuarioService.actualizarIdioma(id, idioma);
        LoginResponse respuesta = usuarioService.construirLoginResponse(usuario, null);

        ApiResponse<LoginResponse> cuerpo = new ApiResponse<>(true, "Idioma actualizado", respuesta);
        return ResponseEntity.ok(cuerpo);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable String id) {
        usuarioService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Listar todos los usuarios (solo ADMIN)")
    @GetMapping("/admin/todos")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<Usuario>>> listarTodos() {
        List<Usuario> usuarios = usuarioService.listarTodos();
        return ResponseEntity.ok(new ApiResponse<>(true, "OK", usuarios));
    }

    @Operation(summary = "Cambiar rol de un usuario (solo ADMIN)")
    @PutMapping("/admin/{id}/rol")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Usuario>> actualizarRol(
            @PathVariable String id,
            @RequestBody Map<String, String> datos) {
        String nuevoRol = datos.getOrDefault("rol", "USUARIO");
        Usuario usuario = usuarioService.actualizarRol(id, nuevoRol);
        return ResponseEntity.ok(new ApiResponse<>(true, "Rol actualizado", usuario));
    }

    @Operation(summary = "Eliminar un usuario por ID (solo ADMIN)")
    @DeleteMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> eliminarComoAdmin(@PathVariable String id) {
        usuarioService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    public record NuevaClaveRequest(String nombre, String claveCompleta) {}

    @GetMapping("/{id}/claves-ssh")
    public ResponseEntity<ApiResponse<List<ClaveSshUsuario>>> listarClavesSsh(@PathVariable String id) {
        Usuario usuario = usuarioService.obtenerPorId(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "OK", usuario.getClavesSsh()));
    }

    @PostMapping("/{id}/claves-ssh")
    public ResponseEntity<ApiResponse<ClaveSshUsuario>> agregarClaveSsh(
            @PathVariable String id,
            @RequestBody NuevaClaveRequest peticion) {
        ClaveSshUsuario nuevaClave = usuarioService.agregarClaveSsh(id, peticion.nombre(), peticion.claveCompleta());
        return ResponseEntity.ok(new ApiResponse<>(true, "Clave SSH añadida", nuevaClave));
    }

    @DeleteMapping("/{idUsuario}/claves-ssh/{idClave}")
    public ResponseEntity<Void> eliminarClaveSsh(@PathVariable String idUsuario, @PathVariable String idClave) {
        usuarioService.eliminarClaveSsh(idUsuario, idClave);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/notificaciones")
    public ResponseEntity<ApiResponse<PreferenciasNotificacion>> obtenerNotificaciones(@PathVariable String id) {
        Usuario usuario = usuarioService.obtenerPorId(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "OK", usuario.getPreferenciasNotificacion()));
    }

    @PutMapping("/{id}/notificaciones")
    public ResponseEntity<ApiResponse<PreferenciasNotificacion>> actualizarNotificaciones(
            @PathVariable String id,
            @RequestBody PreferenciasNotificacion preferencias) {
        PreferenciasNotificacion actualizadas = usuarioService.actualizarPreferenciasNotificacion(id, preferencias);
        return ResponseEntity.ok(new ApiResponse<>(true, "Preferencias actualizadas", actualizadas));
    }
}
