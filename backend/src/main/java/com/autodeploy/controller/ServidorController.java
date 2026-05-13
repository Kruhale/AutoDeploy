package com.autodeploy.controller;

import com.autodeploy.dto.ApiResponse;
import com.autodeploy.dto.ConexionSshRequest;
import com.autodeploy.model.Servidor;
import com.autodeploy.service.ServidorService;
import com.autodeploy.service.SshCommandService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@Tag(name = "Servidores", description = "CRUD de servidores SSH del usuario autenticado")
@RestController
@RequestMapping("/api/servidores")
@PreAuthorize("isAuthenticated()")
public class ServidorController {

    private final ServidorService servidorService;
    private final SshCommandService sshCommandService;

    public ServidorController(ServidorService servidorService, SshCommandService sshCommandService) {
        this.servidorService = servidorService;
        this.sshCommandService = sshCommandService;
    }

    @Operation(summary = "Registrar servidor", description = "Añade un nuevo servidor SSH como propiedad del usuario autenticado")
    @PostMapping
    public ResponseEntity<ApiResponse<Servidor>> registrar(@RequestBody @Valid ConexionSshRequest peticion,
                                                           Authentication autenticacion) {
        String usuarioId = autenticacion.getName();
        Servidor servidor = servidorService.registrar(peticion, usuarioId);
        URI ubicacion = URI.create("/api/servidores/" + servidor.getId());

        ApiResponse<Servidor> cuerpo = new ApiResponse<>(true, "Servidor registrado", servidor);
        return ResponseEntity.created(ubicacion).body(cuerpo);
    }

    @Operation(summary = "Listar servidores", description = "Devuelve la lista de servidores del usuario autenticado (todos si es ADMIN)")
    @GetMapping
    public ResponseEntity<ApiResponse<List<Servidor>>> listar(Authentication autenticacion) {
        String usuarioId = autenticacion.getName();
        List<Servidor> lista = esAdmin(autenticacion)
                ? servidorService.listar()
                : servidorService.listarPorUsuario(usuarioId);
        ApiResponse<List<Servidor>> cuerpo = new ApiResponse<>(true, "OK", lista);
        return ResponseEntity.ok(cuerpo);
    }

    @Operation(summary = "Listar servidores paginados", description = "Version paginada con ?page=0&size=20. Util si hay muchos servidores")
    @GetMapping("/paginadas")
    public ResponseEntity<ApiResponse<Page<Servidor>>> listarPaginadas(Authentication autenticacion, Pageable pageable) {
        String usuarioId = autenticacion.getName();
        Page<Servidor> pagina = servidorService.listarPorUsuarioPaginado(usuarioId, pageable);
        ApiResponse<Page<Servidor>> cuerpo = new ApiResponse<>(true, "OK", pagina);
        return ResponseEntity.ok(cuerpo);
    }

    @Operation(summary = "Obtener servidor por id")
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @seguridad.esDuenioDelServidor(#id, authentication)")
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

    @Operation(summary = "Reiniciar servidor", description = "Ejecuta sudo reboot en el servidor via SSH (solo el propietario o ADMIN)")
    @PostMapping("/{id}/reboot")
    @PreAuthorize("hasRole('ADMIN') or @seguridad.esDuenioDelServidor(#id, authentication)")
    public ResponseEntity<ApiResponse<String>> reiniciar(@PathVariable String id) {
        Servidor servidor = servidorService.obtenerPorId(id);
        sshCommandService.ejecutarComando(servidor, "sudo reboot");

        ApiResponse<String> cuerpo = new ApiResponse<>(true, "Reinicio iniciado en " + servidor.getNombre(), null);
        return ResponseEntity.ok(cuerpo);
    }

    @Operation(summary = "Eliminar servidor", description = "Borra el servidor (solo el propietario o ADMIN)")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @seguridad.esDuenioDelServidor(#id, authentication)")
    public ResponseEntity<Void> eliminar(@PathVariable String id) {
        servidorService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    private static boolean esAdmin(Authentication autenticacion) {
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
}
