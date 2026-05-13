package com.autodeploy.service;

import com.autodeploy.model.Servidor;
import org.springframework.stereotype.Service;

@Service
public class GitDeployService {

    private final SshCommandService sshCommandService;

    public GitDeployService(SshCommandService sshCommandService) {
        this.sshCommandService = sshCommandService;
    }

    public String clonarRepositorio(Servidor servidor, String repoUrl, String directorio) {
        String comando = "git clone " + repoUrl + " " + directorio;
        String salidaDelComando = sshCommandService.ejecutarComando(servidor, comando);
        return salidaDelComando;
    }

    public String actualizarRepositorio(Servidor servidor, String directorio) {
        String comando = "cd " + directorio + " && git pull";
        String salidaDelComando = sshCommandService.ejecutarComando(servidor, comando);
        return salidaDelComando;
    }

    public String desplegarConGit(Servidor servidor, String repoUrl, String directorio) {
        String comando = "if [ -d " + directorio + " ]; then cd " + directorio + " && git pull; else git clone " + repoUrl + " " + directorio + "; fi";
        String salidaDelComando = sshCommandService.ejecutarComando(servidor, comando);
        return salidaDelComando;
    }
}
