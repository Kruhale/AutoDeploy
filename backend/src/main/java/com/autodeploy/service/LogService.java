package com.autodeploy.service;

import com.autodeploy.exception.BadRequestException;
import com.autodeploy.model.Servidor;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;

@Service
public class LogService {

    // Rutas de log permitidas (whitelist). Solo paths absolutos a /var/log o
    // ~/.autodeploy/ con caracteres seguros, ningun comodin ni espacios.
    private static final Pattern RUTA_LOG_VALIDA = Pattern.compile("^[A-Za-z0-9_./~-]+$");

    // Patron de busqueda: alfanumerico, espacios, guiones, puntos, slash,
    // dos puntos y arroba. Nada de comillas, backticks, $, ;, &, |, > o <.
    private static final Pattern PATRON_BUSQUEDA_VALIDO = Pattern.compile("^[A-Za-z0-9 ._/:@-]+$");

    private final SshCommandService sshCommandService;

    public LogService(SshCommandService sshCommandService) {
        this.sshCommandService = sshCommandService;
    }

    public List<String> obtenerUltimasLineas(Servidor servidor, String archivo, int lineas) {
        validarRutaArchivo(archivo);
        validarNumeroLineas(lineas);

        String comando = "tail -n " + lineas + " " + archivo;
        String salidaDelComando = sshCommandService.ejecutarComando(servidor, comando);

        String[] listaDeLineas = salidaDelComando.split("\n");
        return Arrays.asList(listaDeLineas);
    }

    public List<String> buscarEnLogs(Servidor servidor, String archivo, String patron) {
        validarRutaArchivo(archivo);
        validarPatronBusqueda(patron);

        // Aunque ahora la entrada esta saneada, ejecutamos con grep -F (fixed
        // string) para tratar el patron como literal y evitar interpretacion
        // de regex maliciosa por parte de grep.
        String comando = "grep -F " + entrecomillarSeguro(patron) + " " + archivo + " | tail -50";
        String salidaDelComando = sshCommandService.ejecutarComando(servidor, comando);

        String[] listaDeLineas = salidaDelComando.split("\n");
        return Arrays.asList(listaDeLineas);
    }

    private static void validarRutaArchivo(String archivo) {
        if (archivo == null || archivo.isBlank()) {
            throw new BadRequestException("La ruta del archivo de log no puede estar vacia");
        }
        if (!RUTA_LOG_VALIDA.matcher(archivo).matches()) {
            throw new BadRequestException("Ruta de log no valida (solo se permiten letras, numeros, /, -, _, .)");
        }
    }

    private static void validarPatronBusqueda(String patron) {
        if (patron == null || patron.isBlank()) {
            throw new BadRequestException("El patron de busqueda no puede estar vacio");
        }
        if (patron.length() > 200) {
            throw new BadRequestException("El patron de busqueda es demasiado largo (max 200 caracteres)");
        }
        if (!PATRON_BUSQUEDA_VALIDO.matcher(patron).matches()) {
            throw new BadRequestException("Patron de busqueda no valido (solo se permiten caracteres seguros)");
        }
    }

    private static void validarNumeroLineas(int lineas) {
        if (lineas <= 0 || lineas > 5000) {
            throw new BadRequestException("El numero de lineas debe estar entre 1 y 5000");
        }
    }

    private static String entrecomillarSeguro(String texto) {
        // Tras la validacion no deberia haber comillas simples ni dobles,
        // pero hacemos doble seguridad envolviendo en comillas simples.
        return "'" + texto.replace("'", "'\\''") + "'";
    }
}
