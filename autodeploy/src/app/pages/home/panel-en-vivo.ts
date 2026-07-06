import { Component, computed, signal, Signal, AfterViewInit, OnDestroy } from "@angular/core";

// La pieza central del hero: una miniatura del panel de AutoDeploy en vivo.
// Un servidor con metricas latiendo y un despliegue recorriendo su pipeline
// hasta encenderse "live", en bucle. Ensena el producto, no una terminal.
type PasoDelPipeline = { etiqueta: string; detalle: string; duracion: string };

const PASOS_DEL_PIPELINE: PasoDelPipeline[] = [
  { etiqueta: "git pull", detalle: "origin/main", duracion: "0.8s" },
  { etiqueta: "docker build", detalle: "miapp:latest", duracion: "6.2s" },
  { etiqueta: "nginx + ssl", detalle: "certbot ok", duracion: "3.1s" },
  { etiqueta: "live", detalle: "miapp.tudominio.dev", duracion: "12.4s" }
];

const MS_POR_PASO = 1400;
const MS_PAUSA_AL_TERMINAR = 3200;
const MS_TICK_DE_METRICAS = 900;

@Component({
  selector: "app-panel-en-vivo",
  templateUrl: "./panel-en-vivo.html"
})
export class PanelEnVivo implements AfterViewInit, OnDestroy {
  pasos = PASOS_DEL_PIPELINE;
  // -1 = ninguno completado; el paso "activo" es el siguiente al ultimo hecho.
  ultimoPasoCompletado = signal(-1);
  cargaDeCpu = signal(23);
  historialDeCpu = signal<number[]>([18, 22, 19, 25, 21, 27, 24, 20, 26, 23, 28, 22, 25, 23]);

  puntosDeLaGrafica: Signal<string>;
  // El toast de exito entra cuando el pipeline completa el paso "live".
  toastVisible: Signal<boolean>;

  private idDelTemporizadorPipeline = 0;
  private idDelIntervaloMetricas = 0;
  private faseDeLaOnda = 0;

  constructor() {
    const componente = this;

    this.toastVisible = computed(function () {
      return componente.ultimoPasoCompletado() >= PASOS_DEL_PIPELINE.length - 1;
    });

    // El historial (0-100) se proyecta al viewBox 100x24 de la grafica.
    this.puntosDeLaGrafica = computed(function () {
      const historial = componente.historialDeCpu();
      const pasoDeEquis = 100 / (historial.length - 1);
      const puntos: string[] = [];
      for (let indice = 0; indice < historial.length; indice++) {
        const equis = indice * pasoDeEquis;
        const ye = 24 - (historial[indice] / 100) * 22;
        puntos.push(equis.toFixed(1) + "," + ye.toFixed(1));
      }
      return puntos.join(" ");
    });
  }

  ngAfterViewInit(): void {
    const prefiereMenosMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefiereMenosMovimiento) {
      // Estado final quieto: despliegue completado y panel sereno.
      this.ultimoPasoCompletado.set(PASOS_DEL_PIPELINE.length - 1);
      return;
    }
    this.programarAvanceDelPipeline();
    this.arrancarLatidoDeMetricas();
  }

  ngOnDestroy(): void {
    window.clearTimeout(this.idDelTemporizadorPipeline);
    window.clearInterval(this.idDelIntervaloMetricas);
  }

  estadoDelPaso(indice: number): string {
    if (indice <= this.ultimoPasoCompletado()) {
      return "hecho";
    }
    if (indice === this.ultimoPasoCompletado() + 1) {
      return "activo";
    }
    return "pendiente";
  }

  private programarAvanceDelPipeline(): void {
    const componente = this;
    const haTerminado = this.ultimoPasoCompletado() >= PASOS_DEL_PIPELINE.length - 1;
    const retardo = haTerminado ? MS_PAUSA_AL_TERMINAR : MS_POR_PASO;

    this.idDelTemporizadorPipeline = window.setTimeout(function () {
      if (haTerminado) {
        componente.ultimoPasoCompletado.set(-1);
      } else {
        componente.ultimoPasoCompletado.update(function (valor) {
          return valor + 1;
        });
      }
      componente.programarAvanceDelPipeline();
    }, retardo);
  }

  // Paseo suave determinista (senos combinados): la CPU "respira" sin
  // Math.random y sin saltos bruscos.
  private arrancarLatidoDeMetricas(): void {
    const componente = this;
    this.idDelIntervaloMetricas = window.setInterval(function () {
      componente.faseDeLaOnda += 0.7;
      const onda = Math.sin(componente.faseDeLaOnda) * 4 + Math.sin(componente.faseDeLaOnda * 0.37) * 3;
      const cargaNueva = Math.round(23 + onda);

      componente.cargaDeCpu.set(cargaNueva);
      componente.historialDeCpu.update(function (historial) {
        const recortado = historial.slice(1);
        recortado.push(cargaNueva);
        return recortado;
      });
    }, MS_TICK_DE_METRICAS);
  }
}
