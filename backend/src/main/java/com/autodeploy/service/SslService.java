package com.autodeploy.service;

import com.autodeploy.exception.ResourceNotFoundException;
import com.autodeploy.model.Servidor;
import com.autodeploy.repository.ServidorRepository;
import org.springframework.stereotype.Service;

@Service
public class SslService {

    private final SshCommandService sshCommandService;
    private final ServidorRepository servidorRepository;

    public SslService(SshCommandService sshCommandService, ServidorRepository servidorRepository) {
        this.sshCommandService = sshCommandService;
        this.servidorRepository = servidorRepository;
    }

    public String instalarCertbot(Servidor servidor) {
        String comandoDeInstalacion = "sudo apt-get install -y certbot python3-certbot-nginx";
        String salidaDeInstalacion = sshCommandService.ejecutarComando(servidor, comandoDeInstalacion);
        return salidaDeInstalacion;
    }

    public String generarCertificado(Servidor servidor, String dominio, String email) {
        String comandoGenerarCert = "sudo certbot --nginx -d " + dominio
                + " --non-interactive --agree-tos -m " + email;
        String salidaGeneracion = sshCommandService.ejecutarComando(servidor, comandoGenerarCert);
        return salidaGeneracion;
    }

    public String renovarCertificados(Servidor servidor) {
        String salidaRenovacion = sshCommandService.ejecutarComando(servidor, "sudo certbot renew --dry-run");
        return salidaRenovacion;
    }

    public String obtenerEstadoCertificado(Servidor servidor, String dominio) {
        String comandoEstado = "sudo certbot certificates --domain " + dominio;
        String salidaEstado = sshCommandService.ejecutarComando(servidor, comandoEstado);
        return salidaEstado;
    }

    public Servidor obtenerServidorOLanzarError(String servidorId) {
        Servidor servidor = servidorRepository.findById(servidorId)
                .orElseThrow(() -> new ResourceNotFoundException("Servidor no encontrado"));
        return servidor;
    }
}
