import { Component, signal, computed, Signal, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { DatePipe, TitleCasePipe, UpperCasePipe } from "@angular/common";
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
  imports: [DatePipe, TitleCasePipe, UpperCasePipe],
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
    readonly planService: PlanService
  ) {
    const componente = this;

    this.detallePlanActual = computed(function() {
      const id = componente.planService.planActual();
      const encontrado = PLANES.find(function(p) { return p.id === id; });
      return encontrado || PLANES[0];
    });

    this.fechaProximoCobro = computed(function() {
      const ahora = new Date();
      const siguienteMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);
      return siguienteMes;
    });

    this.diasHastaProximoCobro = computed(function() {
      const ahora = Date.now();
      const objetivo = componente.fechaProximoCobro().getTime();
      return Math.max(0, Math.ceil((objetivo - ahora) / MS_POR_DIA));
    });

    this.resumenUso = computed(function(): ResumenUso[] {
      const plan = componente.detallePlanActual();
      const formatear = function(usado: number, limite: number | null): { valor: string, detalle: string, porc: number } {
        if (limite === null) {
          return { valor: String(usado), detalle: "of unlimited", porc: usado === 0 ? 4 : Math.min(100, usado * 5) };
        }
        return {
          valor: String(usado) + "/" + limite,
          detalle: limite === 0 ? "0% used" : Math.round((usado / limite) * 100) + "% used",
          porc: limite === 0 ? 0 : Math.min(100, (usado / limite) * 100)
        };
      };
      const servidores = formatear(componente.numeroServidores(), plan.limiteServidores);
      const despliegues = formatear(componente.numeroDespliegues(), plan.limiteDespliegues);
      const dominios = formatear(componente.numeroDominios(), plan.dominiosPersonalizados);
      return [
        { etiqueta: "Servers connected", valor: servidores.valor, detalle: servidores.detalle, porcentaje: servidores.porc },
        { etiqueta: "Deployments this cycle", valor: despliegues.valor, detalle: despliegues.detalle, porcentaje: despliegues.porc },
        { etiqueta: "Custom domains", valor: dominios.valor, detalle: dominios.detalle, porcentaje: dominios.porc }
      ];
    });
  }

  ngOnInit(): void {
    this.cargarUsoReal();
  }

  private cargarUsoReal(): void {
    const componente = this;

    this.servidorService.listar().subscribe({
      next: function(servidores: ServidorRemoto[]) {
        componente.numeroServidores.set(servidores.length);
        componente.cargarDespliegues();
        componente.cargarDominios(servidores);
      }
    });
  }

  private cargarDespliegues(): void {
    const componente = this;
    this.http.get<any>("/api/despliegues").subscribe({
      next: function(respuesta: any) {
        const lista: DespliegueApi[] = Array.isArray(respuesta) ? respuesta : (respuesta && Array.isArray(respuesta.data) ? respuesta.data : []);
        const inicioMes = new Date();
        inicioMes.setDate(1);
        inicioMes.setHours(0, 0, 0, 0);

        const desplieguesDelCiclo = lista.filter(function(despliegue) {
          const fecha = new Date(despliegue.fechaInicio);
          return fecha.getTime() >= inicioMes.getTime();
        });
        componente.numeroDespliegues.set(desplieguesDelCiclo.length);
      },
      error: function() {
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
    servidores.forEach(function(servidor) {
      componente.http.get<any>("/api/subdominios/servidor/" + servidor.id).subscribe({
        next: function(respuesta: any) {
          const lista = Array.isArray(respuesta) ? respuesta : (respuesta && Array.isArray(respuesta.data) ? respuesta.data : []);
          total = total + lista.length;
          respondidos = respondidos + 1;
          if (respondidos === servidores.length) {
            componente.numeroDominios.set(total);
          }
        },
        error: function() {
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
    this.mensajeMetodoPago.set("Stripe integration coming soon");
    const componente = this;
    setTimeout(function() {
      componente.mensajeMetodoPago.set("");
    }, 3000);
  }
}
