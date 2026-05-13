package com.autodeploy.service;

import com.autodeploy.model.Servidor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class MetricsService {

    private final SshCommandService sshCommandService;

    public MetricsService(SshCommandService sshCommandService) {
        this.sshCommandService = sshCommandService;
    }

    public Map<String, Object> obtenerMetricas(Servidor servidor) {
        String salidaCpu = sshCommandService.ejecutarComando(servidor, "top -bn1 | grep 'Cpu(s)' | awk '{print $2}'");
        String salidaRam = sshCommandService.ejecutarComando(servidor, "free -m | awk '/Mem:/{printf \"%.1f\", $3/$2*100}'");
        String salidaDisco = sshCommandService.ejecutarComando(servidor, "df -h / | awk 'NR==2{print $5}' | tr -d '%'");
        String salidaUptime = sshCommandService.ejecutarComando(servidor, "uptime -p");

        Map<String, Object> mapaDeMetricas = new HashMap<>();
        mapaDeMetricas.put("cpuPorcentaje", salidaCpu.trim());
        mapaDeMetricas.put("ramPorcentaje", salidaRam.trim());
        mapaDeMetricas.put("discoPorcentaje", salidaDisco.trim());
        mapaDeMetricas.put("uptime", salidaUptime.trim());

        return mapaDeMetricas;
    }
}
