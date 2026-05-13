package com.autodeploy.util;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

public class CifradoUtil {

    private static final String ALGORITMO = "AES";

    public static String cifrar(String textoPlano, String clave) {
        try {
            byte[] claveBytes = obtenerClave(clave);
            SecretKeySpec especificacionClave = new SecretKeySpec(claveBytes, ALGORITMO);

            Cipher cifrador = Cipher.getInstance(ALGORITMO);
            cifrador.init(Cipher.ENCRYPT_MODE, especificacionClave);

            byte[] textoCifrado = cifrador.doFinal(textoPlano.getBytes(StandardCharsets.UTF_8));
            String resultado = Base64.getEncoder().encodeToString(textoCifrado);
            return resultado;
        } catch (Exception excepcion) {
            throw new RuntimeException("Error al cifrar", excepcion);
        }
    }

    public static String descifrar(String textoCifrado, String clave) {
        try {
            byte[] claveBytes = obtenerClave(clave);
            SecretKeySpec especificacionClave = new SecretKeySpec(claveBytes, ALGORITMO);

            Cipher cifrador = Cipher.getInstance(ALGORITMO);
            cifrador.init(Cipher.DECRYPT_MODE, especificacionClave);

            byte[] textoDescifrado = cifrador.doFinal(Base64.getDecoder().decode(textoCifrado));
            String resultado = new String(textoDescifrado, StandardCharsets.UTF_8);
            return resultado;
        } catch (Exception excepcion) {
            throw new RuntimeException("Error al descifrar", excepcion);
        }
    }

    private static byte[] obtenerClave(String clave) {
        byte[] claveOriginal = clave.getBytes(StandardCharsets.UTF_8);
        byte[] claveAjustada = new byte[16];
        int longitudCopiada = Math.min(claveOriginal.length, 16);
        System.arraycopy(claveOriginal, 0, claveAjustada, 0, longitudCopiada);
        return claveAjustada;
    }
}
