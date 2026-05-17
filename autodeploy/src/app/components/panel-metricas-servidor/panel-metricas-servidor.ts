import { Component, Input, OnInit, OnDestroy, computed, Signal } from "@angular/core";
import { MetricasServidorService, MetricaServidor } from "../../services/metricas-servidor.service";

@Component({
  selector: "app-panel-metricas-servidor",
  imports: [],
  templateUrl: "./panel-metricas-servidor.html",
  styleUrl: "./panel-metricas-servidor.scss"
})
export class PanelMetricasServidor implements OnInit, OnDestroy {

  @Input({ required: true }) servidorId: string = "";
  @Input() nombreServidor: string = "";

  metricaActual: Signal<MetricaServidor | null>;
  porcentajeRam: Signal<number>;
  tiempoEncendidoTexto: Signal<string>;
  estaEsperandoDatos: Signal<boolean>;

  constructor(private metricasService: MetricasServidorService) {
    const componente = this;

    this.metricaActual = computed(function calcularMetricaActual() {
      const mapaMetricas = componente.metricasService.metricasPorServidor();
      const metricaEncontrada = mapaMetricas.get(componente.servidorId);
      if (metricaEncontrada === undefined) {
        return null;
      }
      return metricaEncontrada;
    });

    this.porcentajeRam = computed(function calcularPorcentajeRam() {
      const metrica = componente.metricaActual();
      if (metrica === null || metrica.ramTotalMb === 0) {
        return 0;
      }
      const porcentajeCalculado = (metrica.ramUsadaMb / metrica.ramTotalMb) * 100;
      const porcentajeRedondeado = Math.round(porcentajeCalculado);
      return porcentajeRedondeado;
    });

    this.tiempoEncendidoTexto = computed(function calcularTiempoTexto() {
      const metrica = componente.metricaActual();
      if (metrica === null) {
        return "";
      }
      const segundosTotales = metrica.tiempoEncendidoSegundos;
      const dias = Math.floor(segundosTotales / 86400);
      const horas = Math.floor((segundosTotales % 86400) / 3600);
      const minutos = Math.floor((segundosTotales % 3600) / 60);
      if (dias > 0) {
        return dias + "d " + horas + "h";
      }
      if (horas > 0) {
        return horas + "h " + minutos + "m";
      }
      return minutos + "m";
    });

    this.estaEsperandoDatos = computed(function calcularEsperandoDatos() {
      const metrica = componente.metricaActual();
      return metrica === null;
    });
  }

  ngOnInit(): void {
    if (this.servidorId !== "") {
      this.metricasService.cargarUltimaMetrica(this.servidorId);
      this.metricasService.conectarTiempoReal();
    }
  }

  ngOnDestroy(): void {
  }

  obtenerClaseColorBarra(porcentaje: number): string {
    if (porcentaje >= 85) {
      return "barra-progreso--critico";
    }
    if (porcentaje >= 65) {
      return "barra-progreso--alerta";
    }
    return "barra-progreso--normal";
  }
}
