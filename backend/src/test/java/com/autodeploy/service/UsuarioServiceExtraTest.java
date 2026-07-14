package com.autodeploy.service;

import com.autodeploy.dto.LoginResponse;
import com.autodeploy.exception.BadRequestException;
import com.autodeploy.exception.ResourceNotFoundException;
import com.autodeploy.model.ClaveSshUsuario;
import com.autodeploy.model.PreferenciasNotificacion;
import com.autodeploy.model.Usuario;
import com.autodeploy.repository.ConfiguracionAsistenteIaRepository;
import com.autodeploy.repository.NotificacionRepository;
import com.autodeploy.repository.UsuarioRepository;
import com.autodeploy.util.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UsuarioServiceExtraTest {

    @Mock private UsuarioRepository usuarioRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtUtil jwtUtil;
    @Mock private NotificacionRepository notificacionRepository;
    @Mock private ConfiguracionAsistenteIaRepository configuracionAsistenteIaRepository;

    @InjectMocks
    private UsuarioService usuarioService;

    private Usuario existente;

    @BeforeEach
    void setUp() {
        existente = new Usuario("Pepe", "p@x.com", "hash");
        existente.setId("u-1");
        existente.setRol(Usuario.ROL_USUARIO);
        existente.setPlan("free");
    }

    @Test
    @DisplayName("actualizar: cambia nombre y email del usuario existente")
    void actualizar_cambiaNombreEmail() {
        when(usuarioRepository.findById("u-1")).thenReturn(Optional.of(existente));
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

        Usuario actualizado = usuarioService.actualizar("u-1", "Nuevo", "nuevo@x.com");

        assertThat(actualizado.getNombre()).isEqualTo("Nuevo");
        assertThat(actualizado.getEmail()).isEqualTo("nuevo@x.com");
    }

    @Test
    @DisplayName("actualizar: lanza 404 si el usuario no existe")
    void actualizar_lanza404() {
        when(usuarioRepository.findById("u-x")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> usuarioService.actualizar("u-x", "n", "e"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("actualizarPlan: cambia el plan y resetea fechaFinSuscripcion")
    void actualizarPlan_cambiaPlan() {
        existente.setFechaFinSuscripcion(LocalDateTime.now());
        when(usuarioRepository.findById("u-1")).thenReturn(Optional.of(existente));
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

        Usuario actualizado = usuarioService.actualizarPlan("u-1", "pro");

        assertThat(actualizado.getPlan()).isEqualTo("pro");
        assertThat(actualizado.getFechaInicioSuscripcion()).isNotNull();
        assertThat(actualizado.getFechaFinSuscripcion()).isNull();
    }

    @Test
    @DisplayName("actualizarRol: ADMIN permitido")
    void actualizarRol_admin() {
        when(usuarioRepository.findById("u-1")).thenReturn(Optional.of(existente));
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

        Usuario actualizado = usuarioService.actualizarRol("u-1", "ADMIN");

        assertThat(actualizado.getRol()).isEqualTo("ADMIN");
    }

    @Test
    @DisplayName("actualizarRol: rol invalido lanza BadRequestException")
    void actualizarRol_lanzaSiInvalido() {
        assertThatThrownBy(() -> usuarioService.actualizarRol("u-1", "SUPERUSER"))
                .isInstanceOf(BadRequestException.class);

        // Verifica que NUNCA llega al repositorio
        verify(usuarioRepository, never()).save(any(Usuario.class));
    }

    @Test
    @DisplayName("cancelarSuscripcion: setea fechaFin un mes despues de la fechaInicio")
    void cancelarSuscripcion_setea() {
        LocalDateTime fechaInicio = LocalDateTime.of(2026, 1, 1, 0, 0);
        existente.setFechaInicioSuscripcion(fechaInicio);
        when(usuarioRepository.findById("u-1")).thenReturn(Optional.of(existente));
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

        Usuario u = usuarioService.cancelarSuscripcion("u-1");

        assertThat(u.getFechaFinSuscripcion()).isEqualTo(fechaInicio.plusMonths(1));
    }

    @Test
    @DisplayName("cancelarSuscripcion: si no hay fechaInicio, usa ahora")
    void cancelarSuscripcion_sinFechaInicio() {
        existente.setFechaInicioSuscripcion(null);
        when(usuarioRepository.findById("u-1")).thenReturn(Optional.of(existente));
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

        Usuario u = usuarioService.cancelarSuscripcion("u-1");

        assertThat(u.getFechaFinSuscripcion()).isNotNull();
    }

    @Test
    @DisplayName("eliminar: borra notificaciones y configuracion del usuario y luego al usuario")
    void eliminar_borraEnCascada() {
        when(usuarioRepository.existsById("u-1")).thenReturn(true);

        usuarioService.eliminar("u-1");

        verify(notificacionRepository).deleteByUsuarioId("u-1");
        verify(configuracionAsistenteIaRepository).deleteByUsuarioId("u-1");
        verify(usuarioRepository).deleteById("u-1");
    }

    @Test
    @DisplayName("eliminar: lanza 404 si no existe")
    void eliminar_lanza404() {
        when(usuarioRepository.existsById("u-x")).thenReturn(false);

        assertThatThrownBy(() -> usuarioService.eliminar("u-x"))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(usuarioRepository, never()).deleteById(any());
    }

    @Test
    @DisplayName("listarTodos: delega al repositorio")
    void listarTodos_delega() {
        when(usuarioRepository.findAll()).thenReturn(List.of(existente));

        assertThat(usuarioService.listarTodos()).hasSize(1);
    }

    @Test
    @DisplayName("agregarClaveSsh: anyade clave al usuario y persiste, devuelve la creada")
    void agregarClaveSsh_anyade() {
        when(usuarioRepository.findById("u-1")).thenReturn(Optional.of(existente));
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

        ClaveSshUsuario nueva = usuarioService.agregarClaveSsh("u-1", "key-prod", "ssh-rsa AAAA");

        assertThat(nueva.getId()).isNotBlank();
        assertThat(nueva.getNombre()).isEqualTo("key-prod");
        assertThat(existente.getClavesSsh()).contains(nueva);
    }

    @Test
    @DisplayName("agregarClaveSsh: si la clave es invalida, la huella sigue siendo SHA256:...")
    void agregarClaveSsh_huellaConsistente() {
        when(usuarioRepository.findById("u-1")).thenReturn(Optional.of(existente));
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

        ClaveSshUsuario nueva = usuarioService.agregarClaveSsh("u-1", "k", "no-es-clave-ssh");

        assertThat(nueva.getHuella()).isNotBlank();
    }

    @Test
    @DisplayName("eliminarClaveSsh: borra la clave por id de la lista del usuario")
    void eliminarClaveSsh_borra() {
        ClaveSshUsuario c1 = new ClaveSshUsuario("c-1", "k1", "h1", "kk1");
        ClaveSshUsuario c2 = new ClaveSshUsuario("c-2", "k2", "h2", "kk2");
        existente.getClavesSsh().add(c1);
        existente.getClavesSsh().add(c2);
        when(usuarioRepository.findById("u-1")).thenReturn(Optional.of(existente));
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

        usuarioService.eliminarClaveSsh("u-1", "c-1");

        assertThat(existente.getClavesSsh()).extracting(ClaveSshUsuario::getId).containsExactly("c-2");
    }

    @Test
    @DisplayName("actualizarPreferenciasNotificacion: persiste las nuevas preferencias")
    void actualizarPreferenciasNotificacion_persiste() {
        when(usuarioRepository.findById("u-1")).thenReturn(Optional.of(existente));
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

        PreferenciasNotificacion nuevas = new PreferenciasNotificacion();
        nuevas.setEmail(false);

        PreferenciasNotificacion devueltas = usuarioService.actualizarPreferenciasNotificacion("u-1", nuevas);

        assertThat(devueltas.isEmail()).isFalse();
        assertThat(existente.getPreferenciasNotificacion()).isSameAs(nuevas);
    }

    @Test
    @DisplayName("actualizarIdioma: acepta es, en, fr, de, it")
    void actualizarIdioma_aceptaSoportados() {
        when(usuarioRepository.findById("u-1")).thenReturn(Optional.of(existente));
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

        for (String idioma : new String[]{"es", "en", "fr", "de", "it"}) {
            Usuario u = usuarioService.actualizarIdioma("u-1", idioma);
            assertThat(u.getIdioma()).isEqualTo(idioma);
        }
    }

    @Test
    @DisplayName("actualizarIdioma: rechaza idiomas no soportados")
    void actualizarIdioma_rechazaNoSoportados() {
        assertThatThrownBy(() -> usuarioService.actualizarIdioma("u-1", "zh"))
                .isInstanceOf(BadRequestException.class);

        assertThatThrownBy(() -> usuarioService.actualizarIdioma("u-1", null))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("construirLoginResponse: plan null cae a 'free'")
    void construirLoginResponse_planNullEsFree() {
        existente.setPlan(null);

        LoginResponse resp = usuarioService.construirLoginResponse(existente, "tok");

        assertThat(resp.plan()).isEqualTo("free");
        assertThat(resp.token()).isEqualTo("tok");
    }

    @Test
    @DisplayName("registrar: lanza BadRequest si el email ya existe")
    void registrar_lanzaSiEmailDuplicado() {
        when(usuarioRepository.existsByEmail("dup@x.com")).thenReturn(true);

        assertThatThrownBy(() -> usuarioService.registrar(
                new com.autodeploy.dto.RegistroRequest("Pepe", "dup@x.com", "passwordOk")))
                .isInstanceOf(BadRequestException.class);
    }
}
