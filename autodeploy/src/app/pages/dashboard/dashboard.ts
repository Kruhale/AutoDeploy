import { Component, signal, computed, Signal, OnInit } from "@angular/core";
import { RouterLink } from "@angular/router";
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

  constructor(private servidorService: ServidorService) {
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
