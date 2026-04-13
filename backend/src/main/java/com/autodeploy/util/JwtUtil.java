package com.autodeploy.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtil {

    private static final long DURACION_MS = 86400000L;
    private static final int LONGITUD_MINIMA_SECRETO = 32;

    @Value("${autodeploy.jwt.secret:}")
    private String secreto;

    @PostConstruct
    void verificarSecreto() {
        if (secreto == null || secreto.isBlank()) {
            throw new IllegalStateException(
                "AUTODEPLOY_JWT_SECRET no esta definida. Configura la variable de entorno "
                + "(o autodeploy.jwt.secret en application.properties) con al menos "
                + LONGITUD_MINIMA_SECRETO + " caracteres antes de arrancar."
            );
        }
        if (secreto.getBytes(StandardCharsets.UTF_8).length < LONGITUD_MINIMA_SECRETO) {
            throw new IllegalStateException(
                "AUTODEPLOY_JWT_SECRET es demasiado corta (minimo " + LONGITUD_MINIMA_SECRETO
                + " bytes para HMAC-SHA seguro)."
            );
        }
    }

    public String generarToken(String usuarioId, String email) {
        return generarToken(usuarioId, email, "USUARIO");
    }

    public String generarToken(String usuarioId, String email, String rol) {
        SecretKey claveSecreta = Keys.hmacShaKeyFor(secreto.getBytes(StandardCharsets.UTF_8));
        return Jwts.builder()
                .subject(usuarioId)
                .claim("email", email)
                .claim("rol", rol != null ? rol : "USUARIO")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + DURACION_MS))
                .signWith(claveSecreta)
                .compact();
    }

    public String extraerUsuarioId(String token) {
        return parsearToken(token).getSubject();
    }

    public String extraerRol(String token) {
        Object rol = parsearToken(token).get("rol");
        return rol != null ? rol.toString() : "USUARIO";
    }

    public boolean esValido(String token) {
        try {
            parsearToken(token);
            return true;
        } catch (Exception error) {
            return false;
        }
    }

    private Claims parsearToken(String token) {
        SecretKey claveSecreta = Keys.hmacShaKeyFor(secreto.getBytes(StandardCharsets.UTF_8));
        return Jwts.parser()
                .verifyWith(claveSecreta)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
