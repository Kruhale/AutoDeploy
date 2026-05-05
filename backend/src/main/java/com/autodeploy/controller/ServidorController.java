package com.autodeploy.controller;

import com.autodeploy.dto.ApiResponse;
import com.autodeploy.dto.ConexionSshRequest;
import com.autodeploy.model.Servidor;
import com.autodeploy.service.ServidorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@Tag(name = "Servidores", description = "CRUD de servidores SSH")
@RestController
@RequestMapping("/api/servidores")
public class ServidorController {

    private final ServidorService servidorService;

    public ServidorController(ServidorService servidorService) {
        this.servidorService = servidorService;
    }

    @Operation(summary = "Registrar servidor", description = "Añade un nuevo servidor SSH al sistema")
    @PostMapping
    public ResponseEntity<ApiResponse<Servidor>> registrar(@RequestBody @Valid ConexionSshRequest peticion) {
        Servidor servidor = servidorService.registrar(peticion);
        URI ubicacion = URI.create("/api/servidores/" + servidor.getId());

        ApiResponse<Servidor> cuerpo = new ApiResponse<>(true, "Servidor registrado", servidor);
        return ResponseEntity.created(ubicacion).body(cuerpo);
    }

    @Operation(summary = "Listar servidores", description = "Devuelve todos los servidores registrados")
    @GetMapping
    public ResponseEntity<ApiResponse<List<Servidor>>> listar() {
        List<Servidor> listaDeServidores = servidorService.listar();

        ApiResponse<List<Servidor>> cuerpo = new ApiResponse<>(true, "OK", listaDeServidores);
        return ResponseEntity.ok(cuerpo);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Servidor>> obtener(@PathVariable String id) {
        Servidor servidor = servidorService.obtenerPorId(id);

        ApiResponse<Servidor> cuerpo = new ApiResponse<>(true, "OK", servidor);
        return ResponseEntity.ok(cuerpo);
    }

    @Operation(summary = "Probar conexion SSH", description = "Verifica si el servidor es accesible por SSH sin guardarlo")
    @PostMapping("/probar-conexion")
    public ResponseEntity<ApiResponse<Boolean>> probarConexion(@RequestBody @Valid ConexionSshRequest peticion) {
        boolean conectado = servidorService.probarConexion(peticion);

        String mensaje = conectado ? "Conexion SSH exitosa" : "No se pudo conectar";
        ApiResponse<Boolean> cuerpo = new ApiResponse<>(conectado, mensaje, conectado);
        return ResponseEntity.ok(cuerpo);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable String id) {
        servidorService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
