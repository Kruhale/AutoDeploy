package com.autodeploy.config;

import com.autodeploy.util.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String CABECERA_AUTORIZACION = "Authorization";
    private static final String PREFIJO_BEARER = "Bearer ";

    private final JwtUtil jwtUtil;

    public JwtAuthenticationFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest peticion, HttpServletResponse respuesta, FilterChain cadena) throws ServletException, IOException {
        String cabeceraAuth = peticion.getHeader(CABECERA_AUTORIZACION);

        boolean cabeceraAusente = cabeceraAuth == null || !cabeceraAuth.startsWith(PREFIJO_BEARER);
        if (cabeceraAusente) {
            cadena.doFilter(peticion, respuesta);
            return;
        }

        String tokenJwt = cabeceraAuth.substring(PREFIJO_BEARER.length());
        boolean tokenValido = jwtUtil.esValido(tokenJwt);
        if (!tokenValido) {
            cadena.doFilter(peticion, respuesta);
            return;
        }

        String usuarioId = jwtUtil.extraerUsuarioId(tokenJwt);
        List<SimpleGrantedAuthority> autoridades = List.of(new SimpleGrantedAuthority("ROLE_USUARIO"));
        UsernamePasswordAuthenticationToken autenticacion = new UsernamePasswordAuthenticationToken(usuarioId, null, autoridades);
        autenticacion.setDetails(new WebAuthenticationDetailsSource().buildDetails(peticion));
        SecurityContextHolder.getContext().setAuthentication(autenticacion);

        cadena.doFilter(peticion, respuesta);
    }
}
