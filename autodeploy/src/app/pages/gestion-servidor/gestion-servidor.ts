import { Component, signal, OnInit } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { MigasPan } from "../../components/shared/migas-pan/migas-pan";
import { ServidorService, ServidorRemoto } from "../../services/servidor.service";

interface MetricasServidor {
  cpuPorcentaje: number;
  ramPorcentaje: number;
  discoPorcentaje: number;
  uptime: string;
}

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

@Component({
  selector: "app-gestion-servidor",
  imports: [MigasPan, RouterLink],
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

  metricasServidor = signal<MetricasServidor | null>(null);
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

        componente.cargarMetricas(idDesdeRuta);
        componente.cargarSalud(idDesdeRuta);
        componente.cargarSubdominios(idDesdeRuta);
      }
    });
  }

  cargarMetricas(idServidor: string): void {
    const componente = this;

    this.http.get<MetricasServidor>("/api/metricas/" + idServidor).subscribe({
      next: function(metricas: MetricasServidor) {
        componente.metricasServidor.set(metricas);
      }
    });
  }

  cargarSalud(idServidor: string): void {
    const componente = this;

    this.http.get<ComprobacionSalud[]>("/api/health/" + idServidor).subscribe({
      next: function(comprobaciones: ComprobacionSalud[]) {
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

    this.http.get<SubdominioItem[]>("/api/subdominios/servidor/" + idServidor).subscribe({
      next: function(subdominios: SubdominioItem[]) {
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
    setTimeout(function() {
      componente.reiniciando.set(false);
      componente.servidorEstado.set("online");
    }, 4000);
  }
}
