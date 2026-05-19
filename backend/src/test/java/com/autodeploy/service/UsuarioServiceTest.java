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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UsuarioServiceTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private NotificacionRepository notificacionRepository;

    @Mock
    private ConfiguracionAsistenteIaRepository configuracionAsistenteRepository;

    @InjectMocks
    private UsuarioService usuarioService;

    private RegistroRequest peticionRegistroValida;
    private LoginRequest peticionLoginValida;
    private Usuario usuarioExistente;

    @BeforeEach
    void configurarDatosDePrueba() {
        peticionRegistroValida = new RegistroRequest("Ana Garcia", "ana@correo.com", "clave123");
        peticionLoginValida = new LoginRequest("ana@correo.com", "clave123");

        usuarioExistente = new Usuario("Ana Garcia", "ana@correo.com", "hashDeLaClave");
        usuarioExistente.setId("id-usuario-123");
    }

    @Test
    @DisplayName("registrar: guarda usuario con password hasheada cuando el email no existe")
    void registrar_deberiaGuardarUsuarioConPasswordHasheada_cuandoEmailNoExiste() {
        when(usuarioRepository.existsByEmail("ana@correo.com")).thenReturn(false);
        when(passwordEncoder.encode("clave123")).thenReturn("hashDeLaClave");
        when(usuarioRepository.save(any(Usuario.class))).thenReturn(usuarioExistente);

        Usuario resultado = usuarioService.registrar(peticionRegistroValida);

        assertThat(resultado).isNotNull();
        assertThat(resultado.getNombre()).isEqualTo("Ana Garcia");
        assertThat(resultado.getEmail()).isEqualTo("ana@correo.com");
        verify(passwordEncoder).encode("clave123");
        verify(usuarioRepository).save(any(Usuario.class));
    }

    @Test
    @DisplayName("registrar: lanza BadRequestException cuando el email ya existe")
    void registrar_deberiaLanzarBadRequestException_cuandoEmailYaExiste() {
        when(usuarioRepository.existsByEmail("ana@correo.com")).thenReturn(true);

        assertThatThrownBy(() -> usuarioService.registrar(peticionRegistroValida))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Ya existe un usuario con ese email");

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    @DisplayName("login: devuelve LoginResponse cuando las credenciales son correctas")
    void login_deberiaRetornarLoginResponse_cuandoCredencialesSonCorrectas() {
        when(usuarioRepository.findByEmail("ana@correo.com")).thenReturn(Optional.of(usuarioExistente));
        when(passwordEncoder.matches("clave123", "hashDeLaClave")).thenReturn(true);
        when(jwtUtil.generarToken(anyString(), anyString())).thenReturn("token-de-prueba");

        LoginResponse respuesta = usuarioService.login(peticionLoginValida);

        assertThat(respuesta).isNotNull();
        assertThat(respuesta.id()).isEqualTo("id-usuario-123");
        assertThat(respuesta.nombre()).isEqualTo("Ana Garcia");
        assertThat(respuesta.email()).isEqualTo("ana@correo.com");
    }

    @Test
    @DisplayName("login: lanza BadRequestException cuando el email no existe")
    void login_deberiaLanzarBadRequestException_cuandoEmailNoExiste() {
        when(usuarioRepository.findByEmail("ana@correo.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> usuarioService.login(peticionLoginValida))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Email o password incorrectos");

        verify(passwordEncoder, never()).matches(anyString(), anyString());
    }

    @Test
    @DisplayName("login: lanza BadRequestException cuando la password es incorrecta")
    void login_deberiaLanzarBadRequestException_cuandoPasswordEsIncorrecta() {
        when(usuarioRepository.findByEmail("ana@correo.com")).thenReturn(Optional.of(usuarioExistente));
        when(passwordEncoder.matches("clave123", "hashDeLaClave")).thenReturn(false);

        assertThatThrownBy(() -> usuarioService.login(peticionLoginValida))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Email o password incorrectos");
    }

    @Test
    @DisplayName("obtenerPorId: devuelve el usuario cuando el id existe")
    void obtenerPorId_deberiaRetornarUsuario_cuandoIdExiste() {
        when(usuarioRepository.findById("id-usuario-123")).thenReturn(Optional.of(usuarioExistente));

        Usuario resultado = usuarioService.obtenerPorId("id-usuario-123");

        assertThat(resultado).isNotNull();
        assertThat(resultado.getId()).isEqualTo("id-usuario-123");
        assertThat(resultado.getNombre()).isEqualTo("Ana Garcia");
    }

    @Test
    @DisplayName("obtenerPorId: lanza ResourceNotFoundException cuando el id no existe")
    void obtenerPorId_deberiaLanzarResourceNotFoundException_cuandoIdNoExiste() {
        when(usuarioRepository.findById("id-inexistente")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> usuarioService.obtenerPorId("id-inexistente"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Usuario no encontrado");
    }
}
