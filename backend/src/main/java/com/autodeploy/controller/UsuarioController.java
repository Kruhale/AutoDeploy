package com.autodeploy.controller;

import com.autodeploy.dto.ApiResponse;
import com.autodeploy.dto.LoginRequest;
import com.autodeploy.dto.LoginResponse;
import com.autodeploy.dto.RegistroRequest;
import com.autodeploy.model.Usuario;
import com.autodeploy.service.UsuarioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
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

    @Operation(summary = "Registrar usuario", description = "Crea una cuenta nueva y devuelve los datos del usuario")
    @PostMapping("/registro")
    public ResponseEntity<ApiResponse<LoginResponse>> registrar(@RequestBody @Valid RegistroRequest peticion) {
        Usuario usuario = usuarioService.registrar(peticion);
        LoginResponse respuesta = new LoginResponse(usuario.getId(), usuario.getNombre(), usuario.getEmail(), null);
        URI ubicacion = URI.create("/api/usuarios/" + usuario.getId());

        ApiResponse<LoginResponse> cuerpo = new ApiResponse<>(true, "Usuario registrado", respuesta);
        return ResponseEntity.created(ubicacion).body(cuerpo);
    }

    @Operation(summary = "Login", description = "Autentica al usuario con email y contraseña")
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@RequestBody @Valid LoginRequest peticion) {
        LoginResponse respuesta = usuarioService.login(peticion);

        ApiResponse<LoginResponse> cuerpo = new ApiResponse<>(true, "Login correcto", respuesta);
        return ResponseEntity.ok(cuerpo);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<LoginResponse>> obtener(@PathVariable String id) {
        Usuario usuario = usuarioService.obtenerPorId(id);
        LoginResponse respuesta = new LoginResponse(usuario.getId(), usuario.getNombre(), usuario.getEmail(), null);

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
        LoginResponse respuesta = new LoginResponse(usuario.getId(), usuario.getNombre(), usuario.getEmail(), null);

        ApiResponse<LoginResponse> cuerpo = new ApiResponse<>(true, "Perfil actualizado", respuesta);
        return ResponseEntity.ok(cuerpo);
    }

    @PutMapping("/{id}/plan")
    public ResponseEntity<ApiResponse<LoginResponse>> actualizarPlan(
            @PathVariable String id,
            @RequestBody Map<String, String> datos) {
        String plan = datos.getOrDefault("plan", "free");

        Usuario usuario = usuarioService.actualizarPlan(id, plan);
        LoginResponse respuesta = new LoginResponse(usuario.getId(), usuario.getNombre(), usuario.getEmail(), null);

        ApiResponse<LoginResponse> cuerpo = new ApiResponse<>(true, "Plan actualizado", respuesta);
        return ResponseEntity.ok(cuerpo);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable String id) {
        usuarioService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
