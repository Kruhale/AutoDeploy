package com.autodeploy.config;

import com.autodeploy.util.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private HttpServletRequest peticion;

    @Mock
    private HttpServletResponse respuesta;

    @Mock
    private FilterChain cadena;

    private JwtAuthenticationFilter filtro;

    @BeforeEach
    void setUp() {
        filtro = new JwtAuthenticationFilter(jwtUtil);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void limpiar() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Sin cabecera Authorization: deja pasar la peticion sin tocar el SecurityContext")
    void sinCabecera_dejaPasar() throws Exception {
        when(peticion.getHeader("Authorization")).thenReturn(null);

        filtro.doFilter(peticion, respuesta, cadena);

        verify(cadena).doFilter(peticion, respuesta);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    @DisplayName("Cabecera sin prefijo Bearer: deja pasar sin tocar el SecurityContext")
    void cabeceraSinBearer_dejaPasar() throws Exception {
        when(peticion.getHeader("Authorization")).thenReturn("Basic abc123");

        filtro.doFilter(peticion, respuesta, cadena);

        verify(cadena).doFilter(peticion, respuesta);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(jwtUtil, never()).esValido(any());
    }

    @Test
    @DisplayName("Token JWT invalido: no autentica, deja pasar")
    void tokenInvalido_noAutentica() throws Exception {
        when(peticion.getHeader("Authorization")).thenReturn("Bearer tokenroto");
        when(jwtUtil.esValido("tokenroto")).thenReturn(false);

        filtro.doFilter(peticion, respuesta, cadena);

        verify(cadena).doFilter(peticion, respuesta);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    @DisplayName("Token JWT valido: setea Authentication con principal=usuarioId y ROLE_<rol>")
    void tokenValido_seteaAuthentication() throws Exception {
        when(peticion.getHeader("Authorization")).thenReturn("Bearer tokenok");
        when(jwtUtil.esValido("tokenok")).thenReturn(true);
        when(jwtUtil.extraerUsuarioId("tokenok")).thenReturn("usuario-99");
        when(jwtUtil.extraerRol("tokenok")).thenReturn("ADMIN");

        filtro.doFilter(peticion, respuesta, cadena);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNotNull();
        assertThat(auth.getPrincipal()).isEqualTo("usuario-99");
        assertThat(auth.getAuthorities()).hasSize(1);
        assertThat(auth.getAuthorities().iterator().next().getAuthority()).isEqualTo("ROLE_ADMIN");
        verify(cadena).doFilter(peticion, respuesta);
    }
}
