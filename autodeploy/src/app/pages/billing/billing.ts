import { Component, signal, computed, Signal, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { DatePipe, UpperCasePipe } from "@angular/common";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { PlanService, PLANES, Plan } from "../../services/plan.service";
import { ServidorService, ServidorRemoto } from "../../services/servidor.service";

interface Factura {
  id: string;
  fecha: string;
  concepto: string;
  importe: string;
  estado: "paid" | "pending" | "failed";
}

interface ResumenUso {
  etiqueta: string;
  valor: string;
  detalle: string;
  porcentaje: number;
  esIlimitado: boolean;
}

interface DespliegueApi {
  id: string;
  fechaInicio: string;
}

interface SubdominioApi {
  id: string;
  nombre: string;
}

const MS_POR_DIA = 86400000;

@Component({
  selector: "app-billing",
  imports: [DatePipe, UpperCasePipe, TranslateModule],
  templateUrl: "./billing.html",
  styleUrl: "./billing.scss"
})
export class Billing implements OnInit {
  listaDeFacturas = signal<Factura[]>([]);
  mensajeMetodoPago = signal("");

  numeroServidores = signal(0);
  numeroDespliegues = signal(0);
  numeroDominios = signal(0);

  detallePlanActual: Signal<Plan>;
  fechaProximoCobro: Signal<Date>;
  diasHastaProximoCobro: Signal<number>;
  resumenUso: Signal<ResumenUso[]>;

  constructor(
    private router: Router,
    private http: HttpClient,
    private servidorService: ServidorService,
    readonly planService: PlanService,
    private translate: TranslateService
  ) {
    const componente = this;

    this.detallePlanActual = computed(function () {
      const id = componente.planService.planActual();
      const encontrado = PLANES.find(function (p) {
        return p.id === id;
      });
      return encontrado || PLANES[0];
    });

    this.fechaProximoCobro = computed(function () {
      const ahora = new Date();
      const siguienteMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);
      return siguienteMes;
    });

    this.diasHastaProximoCobro = computed(function () {
      const ahora = Date.now();
      const objetivo = componente.fechaProximoCobro().getTime();
      return Math.max(0, Math.ceil((objetivo - ahora) / MS_POR_DIA));
    });

    this.resumenUso = computed(function (): ResumenUso[] {
      const plan = componente.detallePlanActual();
      // Con limite infinito una barra de progreso no significa nada: se oculta
      const formatear = function (usado: number, limite: number | null): { valor: string; detalle: string; porc: number; esIlimitado: boolean } {
        if (limite === null) {
          return { valor: String(usado), detalle: componente.translate.instant("billing.uso.deUnlimited"), porc: 0, esIlimitado: true };
        }
        const porcentaje = limite === 0 ? 0 : Math.round((usado / limite) * 100);
        return {
          valor: String(usado) + "/" + limite,
          detalle: limite === 0 ? componente.translate.instant("billing.uso.zeroPercent") : componente.translate.instant("billing.uso.percentUsed", { n: porcentaje }),
          porc: limite === 0 ? 0 : Math.min(100, (usado / limite) * 100),
          esIlimitado: false
        };
      };
      const servidores = formatear(componente.numeroServidores(), plan.limiteServidores);
      const despliegues = formatear(componente.numeroDespliegues(), plan.limiteDespliegues);
      const dominios = formatear(componente.numeroDominios(), plan.dominiosPersonalizados);
      return [
        { etiqueta: componente.translate.instant("billing.uso.servers"), valor: servidores.valor, detalle: servidores.detalle, porcentaje: servidores.porc, esIlimitado: servidores.esIlimitado },
        { etiqueta: componente.translate.instant("billing.uso.deployments"), valor: despliegues.valor, detalle: despliegues.detalle, porcentaje: despliegues.porc, esIlimitado: despliegues.esIlimitado },
        { etiqueta: componente.translate.instant("billing.uso.customDomains"), valor: dominios.valor, detalle: dominios.detalle, porcentaje: dominios.porc, esIlimitado: dominios.esIlimitado }
      ];
    });
  }

  ngOnInit(): void {
    this.cargarUsoReal();
  }

  private cargarUsoReal(): void {
    const componente = this;

    this.servidorService.listar().subscribe({
      next: function (servidores: ServidorRemoto[]) {
        componente.numeroServidores.set(servidores.length);
        componente.cargarDespliegues();
        componente.cargarDominios(servidores);
      }
    });
  }

  // El endpoint de despliegues llega paginado en .data.content (Pageable)
  private extraerLista(respuesta: any): any[] {
    if (Array.isArray(respuesta)) {
      return respuesta;
    }
    const datos = respuesta && respuesta.data !== undefined ? respuesta.data : respuesta;
    if (Array.isArray(datos)) {
      return datos;
    }
    if (datos && Array.isArray(datos.content)) {
      return datos.content;
    }
    return [];
  }

  private cargarDespliegues(): void {
    const componente = this;
    this.http.get<any>("/api/despliegues").subscribe({
      next: function (respuesta: any) {
        const lista: DespliegueApi[] = componente.extraerLista(respuesta);
        const inicioMes = new Date();
        inicioMes.setDate(1);
        inicioMes.setHours(0, 0, 0, 0);

        const desplieguesDelCiclo = lista.filter(function (despliegue) {
          const fecha = new Date(despliegue.fechaInicio);
          return fecha.getTime() >= inicioMes.getTime();
        });
        componente.numeroDespliegues.set(desplieguesDelCiclo.length);
      },
      error: function () {
        componente.numeroDespliegues.set(0);
      }
    });
  }

  private cargarDominios(servidores: ServidorRemoto[]): void {
    if (servidores.length === 0) {
      this.numeroDominios.set(0);
      return;
    }
    const componente = this;
    let total = 0;
    let respondidos = 0;
    servidores.forEach(function (servidor) {
      componente.http.get<any>("/api/subdominios/servidor/" + servidor.id).subscribe({
        next: function (respuesta: any) {
          const lista = Array.isArray(respuesta) ? respuesta : respuesta && Array.isArray(respuesta.data) ? respuesta.data : [];
          total = total + lista.length;
          respondidos = respondidos + 1;
          if (respondidos === servidores.length) {
            componente.numeroDominios.set(total);
          }
        },
        error: function () {
          respondidos = respondidos + 1;
          if (respondidos === servidores.length) {
            componente.numeroDominios.set(total);
          }
        }
      });
    });
  }

  navegarAPlanes(): void {
    this.router.navigate(["/app/cuenta"]);
  }

  agregarMetodoPago(): void {
    this.mensajeMetodoPago.set(this.translate.instant("billing.stripeComingSoon"));
    const componente = this;
    setTimeout(function () {
      componente.mensajeMetodoPago.set("");
    }, 3000);
  }
}
