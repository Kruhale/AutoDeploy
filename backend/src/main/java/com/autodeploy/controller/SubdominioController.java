package com.autodeploy.controller;

import com.autodeploy.dto.ApiResponse;
import com.autodeploy.dto.RegistrarSubdominioRequest;
import com.autodeploy.model.Subdominio;
import com.autodeploy.service.SubdominioService;
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

@RestController
@RequestMapping("/api/subdominios")
public class SubdominioController {

    private final SubdominioService subdominioService;

    public SubdominioController(SubdominioService subdominioService) {
        this.subdominioService = subdominioService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Subdominio>> registrar(@RequestBody RegistrarSubdominioRequest peticion) {
        Subdominio subdominio = subdominioService.registrar(
                peticion.servidorId(),
                peticion.nombre(),
                peticion.tipo(),
                peticion.destino()
        );

        URI ubicacion = URI.create("/api/subdominios/" + subdominio.getId());
        ApiResponse<Subdominio> cuerpo = new ApiResponse<>(true, "Subdominio registrado", subdominio);
        return ResponseEntity.created(ubicacion).body(cuerpo);
    }

    @GetMapping("/servidor/{servidorId}")
    public ResponseEntity<ApiResponse<List<Subdominio>>> listarPorServidor(@PathVariable String servidorId) {
        List<Subdominio> listaDeSubdominios = subdominioService.listarPorServidor(servidorId);

        ApiResponse<List<Subdominio>> cuerpo = new ApiResponse<>(true, "OK", listaDeSubdominios);
        return ResponseEntity.ok(cuerpo);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable String id) {
        subdominioService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
