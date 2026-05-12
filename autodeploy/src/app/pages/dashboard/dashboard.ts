import { Component, signal, computed, Signal, OnInit, OnDestroy } from "@angular/core";
import { RouterLink } from "@angular/router";
import { DatePipe, UpperCasePipe } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { ServidorService, ServidorRemoto } from "../../services/servidor.service";
import { MetricasServidorService } from "../../services/metricas-servidor.service";
import { PanelMetricasServidor } from "../../components/panel-metricas-servidor/panel-metricas-servidor";
import { ContadorAnimadoDirective } from "../../directives/contador-animado.directive";

interface ServidorDashboard {
  id: string;
  nombre: string;
  ip: string;
  estado: "verde" | "naranja" | "rojo";
}

interface SitioWeb {
  nombre: string;
  icono: string;
  colorIcono: "cyan" | "amarillo" | "rojo" | "verde";
  dominio: string;
  estado: "operativo" | "error" | "desplegando";
  textoEstado: string;
}

interface ActividadApi {
  tipo: string;
  mensaje: string;
  icono: string;
  fechaCreacion: string;
}

interface Actividad {
  icono: string;
  colorIcono: "verde" | "rojo" | "azul" | "teal";
  texto: string;
  detalle: string;
}

interface DespliegueReciente {
  id: string;
  servidorId: string;
  tipo: string;
  estado: "completado" | "fallido" | "en_progreso";
  mensaje: string;
  fechaInicio: string;
}

@Component({
  selector: "app-dashboard",
  imports: [RouterLink, DatePipe, UpperCasePipe, PanelMetricasServidor, ContadorAnimadoDirective, TranslateModule],
  templateUrl: "./dashboard.html",
  styleUrl: "./dashboard.scss"
})
export class Dashboard implements OnInit, OnDestroy {
  listaDeServidores = signal<ServidorDashboard[]>([]);
  listaDeSitios = signal<SitioWeb[]>([]);
  listaDeActividad = signal<Actividad[]>([]);
  listaDespliegues = signal<DespliegueReciente[]>([]);
  contadorServidoresOnline: Signal<number>;
  contadorServidoresOffline: Signal<number>;
  claveFraseEstado: Signal<string>;
  colorEstadoFlota: Signal<"verde" | "rojo" | "ambar">;
  fechaActual = new Date();

  constructor(
    private servidorService: ServidorService,
    private http: HttpClient,
    private metricasService: MetricasServidorService,
    private translate: TranslateService
  ) {
    const componente = this;

    this.contadorServidoresOnline = computed(function () {
      const servidores = componente.listaDeServidores();
      const servidoresOnline = servidores.filter(function (servidor) {
        return servidor.estado === "verde";
      });
      return servidoresOnline.length;
    });

    this.contadorServidoresOffline = computed(function () {
      const servidores = componente.listaDeServidores();
      const servidoresOffline = servidores.filter(function (servidor) {
        return servidor.estado === "rojo";
      });
      return servidoresOffline.length;
    });

    // El titular del parte se redacta con los datos reales de la flota
    this.claveFraseEstado = computed(function () {
      const totalServidores = componente.listaDeServidores().length;
      if (totalServidores === 0) {
        return "dashboard.frase.vacia";
      }
      const servidoresCaidos = componente.contadorServidoresOffline();
      if (servidoresCaidos === 0) {
        return "dashboard.frase.orden";
      }
      if (servidoresCaidos === 1) {
        return "dashboard.frase.caidoUno";
      }
      return "dashboard.frase.caidosVarios";
    });

    this.colorEstadoFlota = computed(function () {
      if (componente.listaDeServidores().length === 0) {
        return "ambar";
      }
      if (componente.contadorServidoresOffline() > 0) {
        return "rojo";
      }
      return "verde";
    });
  }

  ngOnInit(): void {
    this.cargarServidores();
    this.cargarActividad();
    this.cargarDespliegues();
    this.metricasService.conectarTiempoReal();
  }

  private cargarSitios(servidores: ServidorRemoto[]): void {
    if (servidores.length === 0) {
      this.listaDeSitios.set([]);
      return;
    }
    const componente = this;
    const acumulado: SitioWeb[] = [];
    let respondidos = 0;

    servidores.forEach(function (servidor) {
      componente.http.get<any>("/api/subdominios/servidor/" + servidor.id).subscribe({
        next: function (respuesta: any) {
          const subdominios = componente.extraerListaDeRespuesta(respuesta);
          subdominios.forEach(function (subdominio: { nombre: string; tipo: string; destino: string; sslActivo: boolean }) {
            acumulado.push({
              nombre: subdominio.nombre,
              icono: "fa-solid fa-globe",
              colorIcono: subdominio.sslActivo ? "verde" : "amarillo",
              dominio: subdominio.destino || subdominio.nombre,
              estado: "operativo",
              textoEstado: subdominio.sslActivo ? "HTTPS" : "HTTP"
            });
          });
          respondidos = respondidos + 1;
          if (respondidos === servidores.length) {
            componente.listaDeSitios.set([...acumulado]);
          }
        },
        error: function () {
          respondidos = respondidos + 1;
          if (respondidos === servidores.length) {
            componente.listaDeSitios.set([...acumulado]);
          }
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.metricasService.desconectar();
  }

  // El backend responde de tres formas: array directo, envuelto en .data, o
  // paginado en .data.content (los despliegues llegan asi por Pageable).
  private extraerListaDeRespuesta(respuesta: any): any[] {
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

  cargarActividad(): void {
    const componente = this;

    this.http.get<any>("/api/actividad").subscribe({
      next: function (respuesta: any) {
        const actividadesApi: ActividadApi[] = componente.extraerListaDeRespuesta(respuesta);
        const actividadesMapeadas = actividadesApi.map(function (actividadApi: ActividadApi) {
          const colorIcono = componente.resolverColorIcono(actividadApi.tipo);
          const tiempoRelativo = componente.calcularTiempoRelativo(actividadApi.fechaCreacion);

          const actividad: Actividad = {
            icono: actividadApi.icono,
            colorIcono: colorIcono,
            texto: actividadApi.mensaje,
            detalle: tiempoRelativo
          };
          return actividad;
        });
        componente.listaDeActividad.set(actividadesMapeadas);
      },
      error: function () {
        componente.listaDeActividad.set([]);
      }
    });
  }

  resolverColorIcono(tipo: string): "verde" | "rojo" | "azul" | "teal" {
    if (tipo === "error" || tipo === "alerta") {
      return "rojo";
    }
    if (tipo === "despliegue") {
      return "azul";
    }
    if (tipo === "ssh" || tipo === "conexion") {
      return "teal";
    }
    return "verde";
  }

  calcularTiempoRelativo(fechaCreacion: string): string {
    const fechaEvento = new Date(fechaCreacion);
    const ahora = new Date();
    const diferenciaEnMs = ahora.getTime() - fechaEvento.getTime();
    const diferenciaEnMinutos = Math.floor(diferenciaEnMs / 60000);

    if (diferenciaEnMinutos < 1) {
      return this.translate.instant("dashboard.tiempoRelativo.haceUnMomento");
    }
    if (diferenciaEnMinutos < 60) {
      return this.translate.instant("dashboard.tiempoRelativo.minutos", { n: diferenciaEnMinutos });
    }

    const diferenciaEnHoras = Math.floor(diferenciaEnMinutos / 60);
    if (diferenciaEnHoras < 24) {
      return this.translate.instant("dashboard.tiempoRelativo.horas", { n: diferenciaEnHoras });
    }

    const diferenciaEnDias = Math.floor(diferenciaEnHoras / 24);
    return this.translate.instant("dashboard.tiempoRelativo.dias", { n: diferenciaEnDias });
  }

  cargarDespliegues(): void {
    const componente = this;

    this.http.get<any>("/api/despliegues").subscribe({
      next: function (respuesta: any) {
        const despliegues: DespliegueReciente[] = componente.extraerListaDeRespuesta(respuesta);
        componente.listaDespliegues.set(despliegues);
      },
      error: function () {
        componente.listaDespliegues.set([]);
      }
    });
  }

  cargarServidores(): void {
    const componente = this;

    // Usamos cargarYCachear() en vez de listar() para que el signal
    // `servidores` del servicio se actualice y otros componentes puedan
    // leerlo (cantidadServidores, servidoresConectados) sin re-pedir.
    this.servidorService.cargarYCachear().subscribe({
      next: function (servidoresRemotos: ServidorRemoto[]) {
        const servidoresMapeados = servidoresRemotos.map(function (servidorRemoto: ServidorRemoto) {
          const servidorDashboard: ServidorDashboard = {
            id: servidorRemoto.id,
            nombre: servidorRemoto.nombre,
            ip: servidorRemoto.direccionIp,
            estado: servidorRemoto.estado === "conectado" ? "verde" : "rojo"
          };
          return servidorDashboard;
        });
        componente.listaDeServidores.set(servidoresMapeados);
        componente.cargarSitios(servidoresRemotos);
      },
      error: function () {
        componente.listaDeServidores.set([]);
      }
    });
  }
}
