package com.autodeploy.util;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Cifrado para guardar las credenciales SSH en MongoDB sin que se vean en claro.
 * Usa AES/GCM (cada cifrado lleva un IV aleatorio y un tag de autenticidad).
 * Los valores antiguos en AES/ECB siguen pudiendose descifrar para no perder credenciales viejas.
 */
public class CifradoUtil {

    private static final String ALGORITMO_GCM = "AES/GCM/NoPadding";
    private static final String ALGORITMO_LEGACY = "AES";
    private static final String PREFIJO_GCM = "v2:";
    private static final int LONGITUD_IV = 12;
    private static final int LONGITUD_TAG_BITS = 128;
    private static final SecureRandom GENERADOR_IV = new SecureRandom();

    private CifradoUtil() {
    }

    public static String cifrar(String textoPlano, String clave) {
        try {
            byte[] claveBytes = derivarClave(clave);
            SecretKeySpec especificacionClave = new SecretKeySpec(claveBytes, "AES");

            byte[] vectorInicial = new byte[LONGITUD_IV];
            GENERADOR_IV.nextBytes(vectorInicial);

            Cipher cifrador = Cipher.getInstance(ALGORITMO_GCM);
            GCMParameterSpec parametrosGcm = new GCMParameterSpec(LONGITUD_TAG_BITS, vectorInicial);
            cifrador.init(Cipher.ENCRYPT_MODE, especificacionClave, parametrosGcm);

            byte[] textoCifradoConTag = cifrador.doFinal(textoPlano.getBytes(StandardCharsets.UTF_8));

            byte[] saliente = new byte[LONGITUD_IV + textoCifradoConTag.length];
            System.arraycopy(vectorInicial, 0, saliente, 0, LONGITUD_IV);
            System.arraycopy(textoCifradoConTag, 0, saliente, LONGITUD_IV, textoCifradoConTag.length);

            return PREFIJO_GCM + Base64.getEncoder().encodeToString(saliente);
        } catch (Exception excepcion) {
            throw new RuntimeException("Error al cifrar", excepcion);
        }
    }

    public static String descifrar(String textoCifrado, String clave) {
        if (textoCifrado != null && textoCifrado.startsWith(PREFIJO_GCM)) {
            return descifrarGcm(textoCifrado.substring(PREFIJO_GCM.length()), clave);
        }
        return descifrarLegacyEcb(textoCifrado, clave);
    }

    private static String descifrarGcm(String textoSinPrefijo, String clave) {
        try {
            byte[] claveBytes = derivarClave(clave);
            SecretKeySpec especificacionClave = new SecretKeySpec(claveBytes, "AES");

            byte[] entrada = Base64.getDecoder().decode(textoSinPrefijo);
            byte[] vectorInicial = new byte[LONGITUD_IV];
            System.arraycopy(entrada, 0, vectorInicial, 0, LONGITUD_IV);

            byte[] textoCifradoConTag = new byte[entrada.length - LONGITUD_IV];
            System.arraycopy(entrada, LONGITUD_IV, textoCifradoConTag, 0, textoCifradoConTag.length);

            Cipher descifrador = Cipher.getInstance(ALGORITMO_GCM);
            GCMParameterSpec parametrosGcm = new GCMParameterSpec(LONGITUD_TAG_BITS, vectorInicial);
            descifrador.init(Cipher.DECRYPT_MODE, especificacionClave, parametrosGcm);

            byte[] textoDescifrado = descifrador.doFinal(textoCifradoConTag);
            return new String(textoDescifrado, StandardCharsets.UTF_8);
        } catch (Exception excepcion) {
            throw new RuntimeException("Error al descifrar", excepcion);
        }
    }

    private static String descifrarLegacyEcb(String textoCifrado, String clave) {
        try {
            byte[] claveBytes = derivarClaveLegacy(clave);
            SecretKeySpec especificacionClave = new SecretKeySpec(claveBytes, ALGORITMO_LEGACY);

            Cipher cifrador = Cipher.getInstance(ALGORITMO_LEGACY);
            cifrador.init(Cipher.DECRYPT_MODE, especificacionClave);

            byte[] textoDescifrado = cifrador.doFinal(Base64.getDecoder().decode(textoCifrado));
            return new String(textoDescifrado, StandardCharsets.UTF_8);
        } catch (Exception excepcion) {
            throw new RuntimeException("Error al descifrar", excepcion);
        }
    }

    private static byte[] derivarClave(String clave) {
        try {
            MessageDigest digestor = MessageDigest.getInstance("SHA-256");
            return digestor.digest(clave.getBytes(StandardCharsets.UTF_8));
        } catch (Exception excepcion) {
            throw new RuntimeException("No se pudo derivar la clave AES con SHA-256", excepcion);
        }
    }

    private static byte[] derivarClaveLegacy(String clave) {
        byte[] claveOriginal = clave.getBytes(StandardCharsets.UTF_8);
        byte[] claveAjustada = new byte[16];
        int longitudCopiada = Math.min(claveOriginal.length, 16);
        System.arraycopy(claveOriginal, 0, claveAjustada, 0, longitudCopiada);
        return claveAjustada;
    }
}
