package com.autodeploy.controller;

import com.autodeploy.dto.ApiResponse;
import com.autodeploy.dto.LoginRequest;
import com.autodeploy.dto.LoginResponse;
import com.autodeploy.dto.RegistroRequest;
import com.autodeploy.model.Usuario;
import com.autodeploy.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.Map;

@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final UsuarioService usuarioService;

    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @PostMapping("/registro")
    public ResponseEntity<ApiResponse<LoginResponse>> registrar(@RequestBody @Valid RegistroRequest peticion) {
        Usuario usuario = usuarioService.registrar(peticion);
        LoginResponse respuesta = new LoginResponse(usuario.getId(), usuario.getNombre(), usuario.getEmail());
        URI ubicacion = URI.create("/api/usuarios/" + usuario.getId());

        ApiResponse<LoginResponse> cuerpo = new ApiResponse<>(true, "Usuario registrado", respuesta);
        return ResponseEntity.created(ubicacion).body(cuerpo);
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@RequestBody @Valid LoginRequest peticion) {
        LoginResponse respuesta = usuarioService.login(peticion);

        ApiResponse<LoginResponse> cuerpo = new ApiResponse<>(true, "Login correcto", respuesta);
        return ResponseEntity.ok(cuerpo);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<LoginResponse>> obtener(@PathVariable String id) {
        Usuario usuario = usuarioService.obtenerPorId(id);
        LoginResponse respuesta = new LoginResponse(usuario.getId(), usuario.getNombre(), usuario.getEmail());

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
        LoginResponse respuesta = new LoginResponse(usuario.getId(), usuario.getNombre(), usuario.getEmail());

        ApiResponse<LoginResponse> cuerpo = new ApiResponse<>(true, "Perfil actualizado", respuesta);
        return ResponseEntity.ok(cuerpo);
    }
}
