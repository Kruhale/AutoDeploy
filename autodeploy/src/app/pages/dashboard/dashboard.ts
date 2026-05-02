import { Component, signal, computed, Signal, OnInit } from "@angular/core";
import { RouterLink } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { ServidorService, ServidorRemoto } from "../../services/servidor.service";

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

@Component({
  selector: "app-dashboard",
  imports: [RouterLink],
  templateUrl: "./dashboard.html",
  styleUrl: "./dashboard.scss"
})
export class Dashboard implements OnInit {
  listaDeServidores = signal<ServidorDashboard[]>([]);
  listaDeSitios = signal<SitioWeb[]>([]);
  listaDeActividad = signal<Actividad[]>([]);
  contadorServidoresOnline: Signal<number>;
  contadorServidoresOffline: Signal<number>;

  constructor(
    private servidorService: ServidorService,
    private http: HttpClient
  ) {
    const componente = this;

    this.contadorServidoresOnline = computed(function() {
      const servidores = componente.listaDeServidores();
      const servidoresOnline = servidores.filter(function(servidor) {
        return servidor.estado === "verde";
      });
      return servidoresOnline.length;
    });

    this.contadorServidoresOffline = computed(function() {
      const servidores = componente.listaDeServidores();
      const servidoresOffline = servidores.filter(function(servidor) {
        return servidor.estado === "rojo";
      });
      return servidoresOffline.length;
    });
  }

  ngOnInit(): void {
    this.cargarServidores();
    this.cargarActividad();
  }

  cargarActividad(): void {
    const componente = this;

    this.http.get<ActividadApi[]>("http://localhost:8080/api/actividad").subscribe({
      next: function(actividadesApi: ActividadApi[]) {
        const actividadesMapeadas = actividadesApi.map(function(actividadApi: ActividadApi) {
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
      return "hace un momento";
    }
    if (diferenciaEnMinutos < 60) {
      return "hace " + diferenciaEnMinutos + " min";
    }

    const diferenciaEnHoras = Math.floor(diferenciaEnMinutos / 60);
    if (diferenciaEnHoras < 24) {
      return "hace " + diferenciaEnHoras + " h";
    }

    const diferenciaEnDias = Math.floor(diferenciaEnHoras / 24);
    return "hace " + diferenciaEnDias + " d";
  }

  cargarServidores(): void {
    const componente = this;

    this.servidorService.listar().subscribe({
      next: function(servidoresRemotos: ServidorRemoto[]) {
        const servidoresMapeados = servidoresRemotos.map(function(servidorRemoto: ServidorRemoto) {
          const servidorDashboard: ServidorDashboard = {
            id: servidorRemoto.id,
            nombre: servidorRemoto.nombre,
            ip: servidorRemoto.direccionIp,
            estado: servidorRemoto.estado === "conectado" ? "verde" : "rojo"
          };
          return servidorDashboard;
        });
        componente.listaDeServidores.set(servidoresMapeados);
      }
    });
  }
}
