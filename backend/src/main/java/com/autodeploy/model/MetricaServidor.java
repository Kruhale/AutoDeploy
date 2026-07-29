package com.autodeploy.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "metricaServidor")
public class MetricaServidor {

    @Id
    private String id;

    @Indexed
    private String servidorId;

    private double cpuPorcentaje;
    private long ramUsadaMb;
    private long ramTotalMb;
    private int discoUsadoPorcentaje;
    private long discoUsadoGb;
    private long discoTotalGb;
    private double cargaPromedio;
    private long tiempoEncendidoSegundos;
    private List<String> webDesplegadas;
    private List<String> containersDocker;
    private boolean sesionActiva;
    private LocalDateTime fechaMedicion;

    public MetricaServidor() {
        this.webDesplegadas = new ArrayList<>();
        this.containersDocker = new ArrayList<>();
        this.fechaMedicion = LocalDateTime.now();
        this.sesionActiva = false;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getServidorId() { return servidorId; }
    public void setServidorId(String servidorId) { this.servidorId = servidorId; }

    public double getCpuPorcentaje() { return cpuPorcentaje; }
    public void setCpuPorcentaje(double cpuPorcentaje) { this.cpuPorcentaje = cpuPorcentaje; }

    public long getRamUsadaMb() { return ramUsadaMb; }
    public void setRamUsadaMb(long ramUsadaMb) { this.ramUsadaMb = ramUsadaMb; }

    public long getRamTotalMb() { return ramTotalMb; }
    public void setRamTotalMb(long ramTotalMb) { this.ramTotalMb = ramTotalMb; }

    public int getDiscoUsadoPorcentaje() { return discoUsadoPorcentaje; }
    public void setDiscoUsadoPorcentaje(int discoUsadoPorcentaje) { this.discoUsadoPorcentaje = discoUsadoPorcentaje; }

    public long getDiscoUsadoGb() { return discoUsadoGb; }
    public void setDiscoUsadoGb(long discoUsadoGb) { this.discoUsadoGb = discoUsadoGb; }

    public long getDiscoTotalGb() { return discoTotalGb; }
    public void setDiscoTotalGb(long discoTotalGb) { this.discoTotalGb = discoTotalGb; }

    public double getCargaPromedio() { return cargaPromedio; }
    public void setCargaPromedio(double cargaPromedio) { this.cargaPromedio = cargaPromedio; }

    public long getTiempoEncendidoSegundos() { return tiempoEncendidoSegundos; }
    public void setTiempoEncendidoSegundos(long tiempoEncendidoSegundos) { this.tiempoEncendidoSegundos = tiempoEncendidoSegundos; }

    public List<String> getWebDesplegadas() { return webDesplegadas; }
    public void setWebDesplegadas(List<String> webDesplegadas) { this.webDesplegadas = webDesplegadas; }

    public List<String> getContainersDocker() { return containersDocker; }
    public void setContainersDocker(List<String> containersDocker) { this.containersDocker = containersDocker; }

    public boolean isSesionActiva() { return sesionActiva; }
    public void setSesionActiva(boolean sesionActiva) { this.sesionActiva = sesionActiva; }

    public LocalDateTime getFechaMedicion() { return fechaMedicion; }
    public void setFechaMedicion(LocalDateTime fechaMedicion) { this.fechaMedicion = fechaMedicion; }
}
