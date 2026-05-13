package com.autodeploy.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CifradoUtilTest {

    private static final String CLAVE_DE_PRUEBA = "claveDeTest1234!";

    @Test
    @DisplayName("cifrar y descifrar: el texto descifrado es igual al original")
    void cifrarYDescifrar_deberiaRetornarElTextoOriginal_cuandoLaClavesCoinciden() {
        String textoOriginal = "mi-password-secreta";

        String textoCifrado = CifradoUtil.cifrar(textoOriginal, CLAVE_DE_PRUEBA);
        String textoDescifrado = CifradoUtil.descifrar(textoCifrado, CLAVE_DE_PRUEBA);

        assertThat(textoDescifrado).isEqualTo(textoOriginal);
    }

    @Test
    @DisplayName("cifrar: el resultado es diferente al texto original")
    void cifrar_deberiaRetornarTextoDistintoAlOriginal() {
        String textoOriginal = "mi-password-secreta";

        String textoCifrado = CifradoUtil.cifrar(textoOriginal, CLAVE_DE_PRUEBA);

        assertThat(textoCifrado).isNotEqualTo(textoOriginal);
    }

    @Test
    @DisplayName("cifrar y descifrar: funciona con string vacio")
    void cifrarYDescifrar_deberiaFuncionar_cuandoElTextoEsVacio() {
        String textoVacio = "";

        String textoCifrado = CifradoUtil.cifrar(textoVacio, CLAVE_DE_PRUEBA);
        String textoDescifrado = CifradoUtil.descifrar(textoCifrado, CLAVE_DE_PRUEBA);

        assertThat(textoDescifrado).isEqualTo(textoVacio);
    }

    @Test
    @DisplayName("cifrar y descifrar: funciona con caracteres especiales")
    void cifrarYDescifrar_deberiaFuncionar_cuandoHayCaracteresEspeciales() {
        String textoConCaracteresEspeciales = "p@$$w0rd!#%&*()_+-=[]{}|;:,./<>?";

        String textoCifrado = CifradoUtil.cifrar(textoConCaracteresEspeciales, CLAVE_DE_PRUEBA);
        String textoDescifrado = CifradoUtil.descifrar(textoCifrado, CLAVE_DE_PRUEBA);

        assertThat(textoDescifrado).isEqualTo(textoConCaracteresEspeciales);
    }

    @Test
    @DisplayName("descifrar: lanza RuntimeException cuando el texto cifrado es invalido")
    void descifrar_deberiaLanzarRuntimeException_cuandoElTextoCifradoEsInvalido() {
        String textoCifradoInvalido = "esto-no-es-base64-valido!!!";

        assertThatThrownBy(() -> CifradoUtil.descifrar(textoCifradoInvalido, CLAVE_DE_PRUEBA))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Error al descifrar");
    }
}
