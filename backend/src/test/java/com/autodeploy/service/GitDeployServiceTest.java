package com.autodeploy.service;

import com.autodeploy.model.Servidor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GitDeployServiceTest {

    @Mock private SshCommandService sshCommandService;

    @InjectMocks
    private GitDeployService gitDeployService;

    private Servidor servidor;

    @BeforeEach
    void setUp() {
        servidor = new Servidor();
        servidor.setId("srv-1");
    }

    @Test
    @DisplayName("clonarRepositorio: ejecuta git clone via SSH")
    void clonar_ejecutaGitClone() {
        when(sshCommandService.ejecutarComando(eq(servidor), contains("git clone https://x/y /srv/app"))).thenReturn("Cloning into...");

        String salida = gitDeployService.clonarRepositorio(servidor, "https://x/y", "/srv/app");

        assertThat(salida).contains("Cloning into");
    }

    @Test
    @DisplayName("actualizarRepositorio: ejecuta cd <dir> && git pull")
    void actualizar_ejecutaGitPull() {
        when(sshCommandService.ejecutarComando(eq(servidor), contains("cd /srv/app && git pull"))).thenReturn("Already up to date.");

        String salida = gitDeployService.actualizarRepositorio(servidor, "/srv/app");

        assertThat(salida).isEqualTo("Already up to date.");
    }

    @Test
    @DisplayName("desplegarConGit: usa if-else para clone o pull segun si existe el directorio")
    void desplegarConGit_ifElse() {
        when(sshCommandService.ejecutarComando(eq(servidor), contains("if [ -d /srv/app ]; then cd /srv/app && git pull; else git clone https://x/y /srv/app; fi"))).thenReturn("OK");

        String salida = gitDeployService.desplegarConGit(servidor, "https://x/y", "/srv/app");

        assertThat(salida).isEqualTo("OK");
    }
}
