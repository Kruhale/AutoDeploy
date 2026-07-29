package com.autodeploy.util;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtUtilTest {

    private static final String SECRETO_VALIDO = "estoEsUnSecretoLargoSuficienteParaHmacSha256AlMenos32Bytes";
    private static final String SECRETO_CORTO = "muyCorto";

    private JwtUtil jwtUtil;

    @BeforeEach
    void inicializarUtil() {
        jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secreto", SECRETO_VALIDO);
    }

    @Test
    @DisplayName("verificarSecreto: lanza si el secreto es null")
    void verificarSecreto_lanzaSiSecretoEsNull() {
        JwtUtil utilSinSecreto = new JwtUtil();
        ReflectionTestUtils.setField(utilSinSecreto, "secreto", null);

        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(utilSinSecreto, "verificarSecreto"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("AUTODEPLOY_JWT_SECRET no esta definida");
    }

    @Test
    @DisplayName("verificarSecreto: lanza si el secreto esta en blanco")
    void verificarSecreto_lanzaSiSecretoEsBlank() {
        JwtUtil utilSinSecreto = new JwtUtil();
        ReflectionTestUtils.setField(utilSinSecreto, "secreto", "   ");

        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(utilSinSecreto, "verificarSecreto"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("verificarSecreto: lanza si el secreto es demasiado corto")
    void verificarSecreto_lanzaSiSecretoEsCorto() {
        JwtUtil utilCorto = new JwtUtil();
        ReflectionTestUtils.setField(utilCorto, "secreto", SECRETO_CORTO);

        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(utilCorto, "verificarSecreto"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("demasiado corta");
    }

    @Test
    @DisplayName("verificarSecreto: NO lanza con un secreto largo y valido")
    void verificarSecreto_aceptaSecretoValido() {
        ReflectionTestUtils.invokeMethod(jwtUtil, "verificarSecreto");
        // si no lanza, ok
    }

    @Test
    @DisplayName("generarToken: produce un JWT no vacio con usuarioId y email")
    void generarToken_produceJwtValido() {
        String token = jwtUtil.generarToken("usuario-1", "test@example.com");

        assertThat(token).isNotBlank();
        assertThat(token.split("\\.")).hasSize(3);
    }

    @Test
    @DisplayName("generarToken: rol por defecto es USUARIO cuando se llama sin rol")
    void generarToken_rolPorDefectoEsUsuario() {
        String token = jwtUtil.generarToken("usuario-1", "test@example.com");

        assertThat(jwtUtil.extraerRol(token)).isEqualTo("USUARIO");
    }

    @Test
    @DisplayName("generarToken: respeta el rol ADMIN si se pasa explicitamente")
    void generarToken_respetaRolAdmin() {
        String token = jwtUtil.generarToken("usuario-admin", "admin@example.com", "ADMIN");

        assertThat(jwtUtil.extraerRol(token)).isEqualTo("ADMIN");
    }

    @Test
    @DisplayName("generarToken: rol null cae al valor por defecto USUARIO")
    void generarToken_rolNullEsUsuario() {
        String token = jwtUtil.generarToken("usuario-2", "x@y.com", null);

        assertThat(jwtUtil.extraerRol(token)).isEqualTo("USUARIO");
    }

    @Test
    @DisplayName("extraerUsuarioId: devuelve el subject del token")
    void extraerUsuarioId_devuelveSubject() {
        String token = jwtUtil.generarToken("usuario-42", "x@y.com");

        assertThat(jwtUtil.extraerUsuarioId(token)).isEqualTo("usuario-42");
    }

    @Test
    @DisplayName("esValido: true para token firmado con la misma clave")
    void esValido_trueConTokenValido() {
        String token = jwtUtil.generarToken("usuario-1", "x@y.com");

        assertThat(jwtUtil.esValido(token)).isTrue();
    }

    @Test
    @DisplayName("esValido: false para token con firma alterada")
    void esValido_falseConTokenAlterado() {
        String token = jwtUtil.generarToken("usuario-1", "x@y.com");
        String tokenManipulado = token.substring(0, token.length() - 4) + "AAAA";

        assertThat(jwtUtil.esValido(tokenManipulado)).isFalse();
    }

    @Test
    @DisplayName("esValido: false para token con un secreto distinto al actual")
    void esValido_falseConSecretoDistinto() {
        String token = jwtUtil.generarToken("usuario-1", "x@y.com");

        JwtUtil otroJwt = new JwtUtil();
        ReflectionTestUtils.setField(otroJwt, "secreto", "otroSecretoLargoDistintoQueTambienTiene32Bytes!");

        assertThat(otroJwt.esValido(token)).isFalse();
    }

    @Test
    @DisplayName("esValido: false para un string que no es un JWT")
    void esValido_falseConBasura() {
        assertThat(jwtUtil.esValido("no-soy-un-jwt")).isFalse();
        assertThat(jwtUtil.esValido("")).isFalse();
        assertThat(jwtUtil.esValido("aaa.bbb.ccc")).isFalse();
    }
}
