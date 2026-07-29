package com.autodeploy.config;

import com.autodeploy.model.Servidor;
import com.autodeploy.repository.ServidorRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SeguridadTest {

    @Mock
    private ServidorRepository servidorRepository;

    @InjectMocks
    private Seguridad seguridad;

    private Authentication authUsuario;
    private Authentication authAdmin;

    @BeforeEach
    void setUp() {
        authUsuario = new UsernamePasswordAuthenticationToken(
                "usuario-1", null, List.of(new SimpleGrantedAuthority("ROLE_USUARIO")));
        authAdmin = new UsernamePasswordAuthenticationToken(
                "admin-1", null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
    }

    @Test
    @DisplayName("esDuenioDelServidor: true si el servidor pertenece al usuario autenticado")
    void esDuenioDelServidor_trueSiPropietario() {
        Servidor servidor = new Servidor();
        servidor.setId("srv-1");
        servidor.setUsuarioId("usuario-1");

        when(servidorRepository.findByIdAndUsuarioId("srv-1", "usuario-1")).thenReturn(Optional.of(servidor));

        assertThat(seguridad.esDuenioDelServidor("srv-1", authUsuario)).isTrue();
    }

    @Test
    @DisplayName("esDuenioDelServidor: false si el servidor no aparece para ese usuario")
    void esDuenioDelServidor_falseSiNoPropietario() {
        when(servidorRepository.findByIdAndUsuarioId("srv-1", "usuario-1")).thenReturn(Optional.empty());

        assertThat(seguridad.esDuenioDelServidor("srv-1", authUsuario)).isFalse();
    }

    @Test
    @DisplayName("esDuenioDelServidor: false si auth es null")
    void esDuenioDelServidor_falseSiAuthNull() {
        assertThat(seguridad.esDuenioDelServidor("srv-1", null)).isFalse();
    }

    @Test
    @DisplayName("esDuenioDelServidor: false si servidorId es null")
    void esDuenioDelServidor_falseSiServidorIdNull() {
        assertThat(seguridad.esDuenioDelServidor(null, authUsuario)).isFalse();
    }

    @Test
    @DisplayName("esElMismoUsuario: true cuando el id del path coincide con el authenticated")
    void esElMismoUsuario_trueSiCoincide() {
        assertThat(seguridad.esElMismoUsuario("usuario-1", authUsuario)).isTrue();
    }

    @Test
    @DisplayName("esElMismoUsuario: false cuando el id del path es distinto")
    void esElMismoUsuario_falseSiDistinto() {
        assertThat(seguridad.esElMismoUsuario("otro-usuario", authUsuario)).isFalse();
    }

    @Test
    @DisplayName("esElMismoUsuario: false si auth es null")
    void esElMismoUsuario_falseSiAuthNull() {
        assertThat(seguridad.esElMismoUsuario("usuario-1", null)).isFalse();
    }

    @Test
    @DisplayName("esElMismoUsuario: false si el id del path es null")
    void esElMismoUsuario_falseSiPathNull() {
        assertThat(seguridad.esElMismoUsuario(null, authUsuario)).isFalse();
    }

    @Test
    @DisplayName("esAdmin: true para ROLE_ADMIN")
    void esAdmin_trueParaAdmin() {
        assertThat(seguridad.esAdmin(authAdmin)).isTrue();
    }

    @Test
    @DisplayName("esAdmin: false para ROLE_USUARIO")
    void esAdmin_falseParaUsuario() {
        assertThat(seguridad.esAdmin(authUsuario)).isFalse();
    }

    @Test
    @DisplayName("esAdmin: false si auth es null")
    void esAdmin_falseSiAuthNull() {
        assertThat(seguridad.esAdmin(null)).isFalse();
    }
}
