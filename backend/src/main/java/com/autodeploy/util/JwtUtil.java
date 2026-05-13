package com.autodeploy.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtil {

    private static final long DURACION_MS = 86400000L;

    @Value("${autodeploy.jwt.secret:clave-secreta-por-defecto-minimo-32-caracteres-ok}")
    private String secreto;

    public String generarToken(String usuarioId, String email) {
        SecretKey claveSecreta = Keys.hmacShaKeyFor(secreto.getBytes(StandardCharsets.UTF_8));
        return Jwts.builder()
                .subject(usuarioId)
                .claim("email", email)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + DURACION_MS))
                .signWith(claveSecreta)
                .compact();
    }

    public String extraerUsuarioId(String token) {
        return parsearToken(token).getSubject();
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
