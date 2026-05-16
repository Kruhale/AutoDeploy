package com.autodeploy.service;

import com.autodeploy.model.ReglaFirewall;
import com.autodeploy.model.Servidor;
import com.autodeploy.repository.ReglaFirewallRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FirewallService {

    private final ReglaFirewallRepository reglaFirewallRepository;
    private final ServidorService servidorService;
    private final SshCommandService sshCommandService;

    public FirewallService(ReglaFirewallRepository reglaFirewallRepository,
                           ServidorService servidorService,
                           SshCommandService sshCommandService) {
        this.reglaFirewallRepository = reglaFirewallRepository;
        this.servidorService = servidorService;
        this.sshCommandService = sshCommandService;
    }

    public List<ReglaFirewall> listarPorServidor(String servidorId) {
        return reglaFirewallRepository.findByServidorId(servidorId);
    }

    public ReglaFirewall agregarRegla(String servidorId, String puerto, String protocolo, String accion, String origen, String descripcion) {
        Servidor servidor = servidorService.obtenerPorId(servidorId);
        String comandoUfw = construirComandoUfw(accion, puerto, protocolo, origen);
        ejecutarSeguro(servidor, comandoUfw);

        ReglaFirewall nuevaRegla = new ReglaFirewall(servidorId, puerto, protocolo, accion, origen, descripcion);
        return reglaFirewallRepository.save(nuevaRegla);
    }

    public void eliminarRegla(String idRegla) {
        ReglaFirewall regla = reglaFirewallRepository.findById(idRegla)
                .orElseThrow(() -> new RuntimeException("Regla no encontrada"));

        Servidor servidor = servidorService.obtenerPorId(regla.getServidorId());
        String comandoDelete = "sudo ufw delete " + regla.getAccion() + " " + regla.getPuerto() + "/" + regla.getProtocolo().toLowerCase();
        ejecutarSeguro(servidor, comandoDelete);

        reglaFirewallRepository.delete(regla);
    }

    public void activarFirewall(String servidorId) {
        Servidor servidor = servidorService.obtenerPorId(servidorId);
        ejecutarSeguro(servidor, "sudo ufw --force enable");
    }

    public void desactivarFirewall(String servidorId) {
        Servidor servidor = servidorService.obtenerPorId(servidorId);
        ejecutarSeguro(servidor, "sudo ufw disable");
    }

    public String estado(String servidorId) {
        Servidor servidor = servidorService.obtenerPorId(servidorId);
        return ejecutarSeguro(servidor, "sudo ufw status");
    }

    private String construirComandoUfw(String accion, String puerto, String protocolo, String origen) {
        String protocoloMinusculas = protocolo.toLowerCase();
        if (origen != null && !origen.isBlank() && !origen.equals("0.0.0.0/0")) {
            return "sudo ufw " + accion + " from " + origen + " to any port " + puerto + " proto " + protocoloMinusculas;
        }
        return "sudo ufw " + accion + " " + puerto + "/" + protocoloMinusculas;
    }

    private String ejecutarSeguro(Servidor servidor, String comando) {
        try {
            return sshCommandService.ejecutarComando(servidor, comando);
        } catch (Exception excepcion) {
            return "";
        }
    }
}
