package com.autodeploy.service;

import com.autodeploy.model.Servidor;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

@Service
public class LogService {

    private final SshCommandService sshCommandService;

    public LogService(SshCommandService sshCommandService) {
        this.sshCommandService = sshCommandService;
    }

    public List<String> obtenerUltimasLineas(Servidor servidor, String archivo, int lineas) {
        String comando = "tail -n " + lineas + " " + archivo;
        String salidaDelComando = sshCommandService.ejecutarComando(servidor, comando);

        String[] listaDeLineas = salidaDelComando.split("\n");
        return Arrays.asList(listaDeLineas);
    }

    public List<String> buscarEnLogs(Servidor servidor, String archivo, String patron) {
        String comando = "grep \"" + patron + "\" " + archivo + " | tail -50";
        String salidaDelComando = sshCommandService.ejecutarComando(servidor, comando);

        String[] listaDeLineas = salidaDelComando.split("\n");
        return Arrays.asList(listaDeLineas);
    }
}
