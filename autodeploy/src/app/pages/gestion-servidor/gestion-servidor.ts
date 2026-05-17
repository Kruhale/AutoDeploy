import { Component, signal, OnInit } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { TarjetaEstadistica } from "../../components/shared/tarjeta-estadistica/tarjeta-estadistica";
import { ServidorService, ServidorRemoto } from "../../services/servidor.service";

interface AplicacionHospedada {
  icono: string;
  textoIcono: string;
  colorIcono: "amarillo" | "cyan" | "teal";
  nombre: string;
  meta: string;
  version: string;
}

interface ComprobacionSalud {
  estado: "online" | "offline" | "degraded";
  tiempoRespuestaMs: number;
  fechaComprobacion: string;
}

interface SubdominioItem {
  id: string;
  nombre: string;
  tipo: string;
  destino: string;
  sslActivo: boolean;
}

interface DespliegueApi {
  id: string;
  servidorId: string;
  tipo: string;
  url: string;
  estado: string;
  mensaje: string;
  fechaInicio: string;
}

@Component({
  selector: "app-gestion-servidor",
  imports: [TarjetaEstadistica, RouterLink],
  templateUrl: "./gestion-servidor.html",
  styleUrl: "./gestion-servidor.scss"
})
export class GestionServidor implements OnInit {
  servidorId = signal("");
  servidorNombre = signal("—");
  servidorIp = signal("—");
  servidorEstado = signal<"online" | "offline" | "warning">("offline");
  servidorUsuario = signal("—");
  servidorPuerto = signal(22);
  reiniciando = signal(false);

  listaDeAplicaciones = signal<AplicacionHospedada[]>([]);
  estadoSalud = signal<ComprobacionSalud | null>(null);
  historialSalud = signal<ComprobacionSalud[]>([]);
  listaSubdominios = signal<SubdominioItem[]>([]);

  constructor(
    private ruta: ActivatedRoute,
    private servidorService: ServidorService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const idDesdeRuta = this.ruta.snapshot.paramMap.get("id");
    if (!idDesdeRuta) {
      return;
    }

    this.servidorId.set(idDesdeRuta);
    const componente = this;

    this.servidorService.obtenerPorId(idDesdeRuta).subscribe({
      next: function(servidor: ServidorRemoto) {
        componente.servidorNombre.set(servidor.nombre);
        componente.servidorIp.set(servidor.direccionIp);
        componente.servidorUsuario.set(servidor.usuarioSsh);
        componente.servidorPuerto.set(servidor.puertoSsh);

        const estadoMapeado = servidor.estado === "conectado" ? "online" : "offline";
        componente.servidorEstado.set(estadoMapeado);

        componente.cargarSalud(idDesdeRuta);
        componente.cargarSubdominios(idDesdeRuta);
        componente.cargarAplicaciones(idDesdeRuta);
      }
    });
  }

  cargarAplicaciones(idServidor: string): void {
    const componente = this;

    this.http.get<any>("/api/despliegues/servidor/" + idServidor).subscribe({
      next: function(respuesta: any) {
        const despliegues: DespliegueApi[] = Array.isArray(respuesta) ? respuesta : (respuesta && Array.isArray(respuesta.data) ? respuesta.data : []);
        const aplicaciones = despliegues.map(function(despliegue): AplicacionHospedada {
          return {
            icono: "fa-solid fa-cube",
            textoIcono: "",
            colorIcono: despliegue.estado === "completado" ? "amarillo" : (despliegue.estado === "fallido" ? "teal" : "cyan"),
            nombre: despliegue.url || despliegue.tipo,
            meta: despliegue.tipo + " · " + despliegue.estado,
            version: despliegue.fechaInicio ? new Date(despliegue.fechaInicio).toLocaleDateString() : "—"
          };
        });
        componente.listaDeAplicaciones.set(aplicaciones);
      },
      error: function() {
        componente.listaDeAplicaciones.set([]);
      }
    });
  }

  cargarSalud(idServidor: string): void {
    const componente = this;

    this.http.get<any>("/api/health/" + idServidor).subscribe({
      next: function(respuesta: any) {
        const comprobaciones: ComprobacionSalud[] = Array.isArray(respuesta) ? respuesta : (respuesta && Array.isArray(respuesta.data) ? respuesta.data : []);
        if (comprobaciones.length > 0) {
          componente.estadoSalud.set(comprobaciones[0]);
        }
        const ultimasCinco = comprobaciones.slice(0, 5);
        componente.historialSalud.set(ultimasCinco);
      }
    });
  }

  cargarSubdominios(idServidor: string): void {
    const componente = this;

    this.http.get<any>("/api/subdominios/servidor/" + idServidor).subscribe({
      next: function(respuesta: any) {
        const subdominios: SubdominioItem[] = Array.isArray(respuesta) ? respuesta : (respuesta && Array.isArray(respuesta.data) ? respuesta.data : []);
        componente.listaSubdominios.set(subdominios);
      }
    });
  }

  eliminarSubdominio(idSubdominio: string): void {
    const componente = this;
    const idServidor = this.servidorId();

    this.http.delete("/api/subdominios/" + idSubdominio).subscribe({
      next: function() {
        componente.cargarSubdominios(idServidor);
      }
    });
  }

  reiniciarServidor(): void {
    this.reiniciando.set(true);
    this.servidorEstado.set("warning");

    const componente = this;
    const idActual = this.servidorId();

    this.http.post<{ success: boolean; message: string }>("/api/servidores/" + idActual + "/reboot", {}).subscribe({
      next: function(respuesta) {
        const componenteInterior = componente;
        setTimeout(function() {
          componenteInterior.reiniciando.set(false);
          componenteInterior.servidorService.obtenerPorId(idActual).subscribe({
            next: function(servidorActualizado: ServidorRemoto) {
              const estadoTrasReinicio = servidorActualizado.estado === "conectado" ? "online" : "offline";
              componenteInterior.servidorEstado.set(estadoTrasReinicio);
            }
          });
        }, 5000);
      },
      error: function() {
        componente.reiniciando.set(false);
        componente.servidorEstado.set("offline");
      }
    });
  }
}
