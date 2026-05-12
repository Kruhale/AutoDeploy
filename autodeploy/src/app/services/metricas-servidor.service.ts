import { Injectable, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";

export interface MetricaServidor {
  id: string;
  servidorId: string;
  cpuPorcentaje: number;
  ramUsadaMb: number;
  ramTotalMb: number;
  discoUsadoPorcentaje: number;
  discoUsadoGb: number;
  discoTotalGb: number;
  cargaPromedio: number;
  tiempoEncendidoSegundos: number;
  webDesplegadas: string[];
  containersDocker: string[];
  sesionActiva: boolean;
  fechaMedicion: string;
}

@Injectable({ providedIn: "root" })
export class MetricasServidorService {
  metricasPorServidor = signal<Map<string, MetricaServidor>>(new Map());

  private socketWeb: WebSocket | null = null;
  private intervaloReconexion: number | null = null;
  private desconectadoManualmente = false;

  constructor(private clienteHttp: HttpClient) {}

  async cargarUltimaMetrica(servidorId: string): Promise<MetricaServidor | null> {
    const urlPeticion = "/api/metricas/" + servidorId + "/ultima";
    try {
      const metricaRecibida = await firstValueFrom(this.clienteHttp.get<MetricaServidor>(urlPeticion));
      this.actualizarMetricaEnMapa(metricaRecibida);
      return metricaRecibida;
    } catch (errorPeticion) {
      return null;
    }
  }

  conectarTiempoReal(): void {
    if (this.socketWeb !== null) {
      const yaConectando = this.socketWeb.readyState === WebSocket.CONNECTING;
      const yaConectado = this.socketWeb.readyState === WebSocket.OPEN;
      if (yaConectando || yaConectado) {
        return;
      }
    }
    this.desconectadoManualmente = false;
    const protocoloSocket = window.location.protocol === "https:" ? "wss:" : "ws:";
    const tokenJwt = sessionStorage.getItem("token") || localStorage.getItem("token") || "";
    const urlSocket = protocoloSocket + "//" + window.location.host + "/ws/metricas?token=" + encodeURIComponent(tokenJwt);
    this.socketWeb = new WebSocket(urlSocket);

    const servicio = this;
    this.socketWeb.addEventListener("message", function manejarMensajeSocket(evento: MessageEvent) {
      try {
        const metricaRecibida = JSON.parse(evento.data) as MetricaServidor;
        servicio.actualizarMetricaEnMapa(metricaRecibida);
      } catch (errorParse) {
        console.warn("Error parseando metrica desde WebSocket:", errorParse);
      }
    });

    this.socketWeb.addEventListener("close", function manejarCierreSocket() {
      servicio.programarReconexion();
    });

    this.socketWeb.addEventListener("error", function manejarErrorSocket() {
      if (servicio.socketWeb !== null) {
        servicio.socketWeb.close();
      }
    });
  }

  desconectar(): void {
    this.desconectadoManualmente = true;
    if (this.intervaloReconexion !== null) {
      window.clearTimeout(this.intervaloReconexion);
      this.intervaloReconexion = null;
    }
    if (this.socketWeb !== null) {
      this.socketWeb.close();
      this.socketWeb = null;
    }
  }

  obtenerMetrica(servidorId: string): MetricaServidor | null {
    const mapaActual = this.metricasPorServidor();
    const metricaCacheada = mapaActual.get(servidorId);
    if (metricaCacheada === undefined) {
      return null;
    }
    return metricaCacheada;
  }

  private actualizarMetricaEnMapa(metrica: MetricaServidor): void {
    const mapaActualizado = new Map(this.metricasPorServidor());
    mapaActualizado.set(metrica.servidorId, metrica);
    this.metricasPorServidor.set(mapaActualizado);
  }

  private programarReconexion(): void {
    if (this.desconectadoManualmente) {
      return;
    }
    if (this.intervaloReconexion !== null) {
      return;
    }
    const servicio = this;
    this.intervaloReconexion = window.setTimeout(function reconectarWebSocket() {
      servicio.intervaloReconexion = null;
      servicio.conectarTiempoReal();
    }, 5000);
  }
}
