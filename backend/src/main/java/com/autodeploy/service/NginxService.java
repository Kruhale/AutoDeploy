package com.autodeploy.service;

import com.autodeploy.exception.ResourceNotFoundException;
import com.autodeploy.model.Servidor;
import com.autodeploy.repository.ServidorRepository;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

@Service
public class NginxService {

    private final SshCommandService sshCommandService;
    private final ServidorRepository servidorRepository;

    public NginxService(SshCommandService sshCommandService, ServidorRepository servidorRepository) {
        this.sshCommandService = sshCommandService;
        this.servidorRepository = servidorRepository;
    }

    public String instalarNginx(Servidor servidor) {
        String comandoDeInstalacion = "sudo apt-get update && sudo apt-get install -y nginx";
        String salidaDeInstalacion = sshCommandService.ejecutarComando(servidor, comandoDeInstalacion);
        return salidaDeInstalacion;
    }

    public String generarConfig(String dominio, int puertoProxy) {
        String configuracionNginx = "server {\n"
                + "    listen 80;\n"
                + "    server_name " + dominio + ";\n"
                + "\n"
                + "    location / {\n"
                + "        proxy_pass http://127.0.0.1:" + puertoProxy + ";\n"
                + "        proxy_set_header Host $host;\n"
                + "        proxy_set_header X-Real-IP $remote_addr;\n"
                + "        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n"
                + "        proxy_set_header X-Forwarded-Proto $scheme;\n"
                + "    }\n"
                + "}\n";
        return configuracionNginx;
    }

    public String subirConfig(Servidor servidor, String dominio, String config) {
        String configEscapada = config.replace("'", "'\\''");
        String rutaDisponible = "/etc/nginx/sites-available/" + dominio;
        String rutaHabilitada = "/etc/nginx/sites-enabled/" + dominio;

        String comandoEscribirConfig = "echo '" + configEscapada + "' | sudo tee " + rutaDisponible;
        sshCommandService.ejecutarComando(servidor, comandoEscribirConfig);

        String comandoCrearEnlace = "sudo ln -sf " + rutaDisponible + " " + rutaHabilitada;
        sshCommandService.ejecutarComando(servidor, comandoCrearEnlace);

        String comandoRecargar = "sudo nginx -t && sudo systemctl reload nginx";
        String salidaRecarga = sshCommandService.ejecutarComando(servidor, comandoRecargar);
        return salidaRecarga;
    }

    public List<String> listarVirtualHosts(Servidor servidor) {
        String salidaListado = sshCommandService.ejecutarComando(servidor, "ls /etc/nginx/sites-enabled/");
        if (salidaListado == null || salidaListado.isBlank()) {
            return List.of();
        }
        String[] nombresDeHosts = salidaListado.trim().split("\\s+");
        List<String> listaDeVirtualHosts = Arrays.asList(nombresDeHosts);
        return listaDeVirtualHosts;
    }

    public String eliminarVirtualHost(Servidor servidor, String dominio) {
        String rutaHabilitada = "/etc/nginx/sites-enabled/" + dominio;
        String rutaDisponible = "/etc/nginx/sites-available/" + dominio;

        String comandoEliminarEnlace = "sudo rm -f " + rutaHabilitada;
        sshCommandService.ejecutarComando(servidor, comandoEliminarEnlace);

        String comandoEliminarConfig = "sudo rm -f " + rutaDisponible;
        sshCommandService.ejecutarComando(servidor, comandoEliminarConfig);

        String comandoRecargar = "sudo systemctl reload nginx";
        String salidaRecarga = sshCommandService.ejecutarComando(servidor, comandoRecargar);
        return salidaRecarga;
    }

    public Servidor obtenerServidorOLanzarError(String servidorId) {
        Servidor servidor = servidorRepository.findById(servidorId)
                .orElseThrow(() -> new ResourceNotFoundException("Servidor no encontrado"));
        return servidor;
    }
}
