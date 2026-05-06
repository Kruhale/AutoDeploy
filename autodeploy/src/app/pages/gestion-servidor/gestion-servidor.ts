import { Component, signal, OnInit } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { TarjetaEstadistica } from "../../components/shared/tarjeta-estadistica/tarjeta-estadistica";
import { MigasPan } from "../../components/shared/migas-pan/migas-pan";
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

@Component({
  selector: "app-gestion-servidor",
  imports: [TarjetaEstadistica, MigasPan, RouterLink],
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
      }
    });
  }

  cargarSalud(idServidor: string): void {
    const componente = this;

    this.http.get<ComprobacionSalud[]>("http://localhost:8080/api/health/" + idServidor).subscribe({
      next: function(comprobaciones: ComprobacionSalud[]) {
        if (comprobaciones.length > 0) {
          componente.estadoSalud.set(comprobaciones[0]);
        }
        const ultimasCinco = comprobaciones.slice(0, 5);
        componente.historialSalud.set(ultimasCinco);
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
