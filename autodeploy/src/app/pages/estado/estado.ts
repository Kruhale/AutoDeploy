import { Component, OnDestroy, OnInit, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { TranslateModule } from "@ngx-translate/core";

interface EstadoServicio {
  clave: string;
  estado: "UP" | "DOWN" | "DEGRADED";
  descripcion: string;
}

interface EstadoSistema {
  estadoGeneral: "UP" | "DOWN" | "DEGRADED";
  actualizadoEn: string;
  servicios: EstadoServicio[];
}

@Component({
  selector: "app-estado",
  imports: [TranslateModule],
  templateUrl: "./estado.html",
})
export class Estado implements OnInit, OnDestroy {
  protected readonly estadoActual = signal<EstadoSistema | null>(null);
  protected readonly cargando = signal<boolean>(true);
  protected readonly errorRed = signal<boolean>(false);

  private temporizadorRefresco: number | null = null;

  constructor(private readonly clienteHttp: HttpClient) {}

  ngOnInit(): void {
    this.cargarEstado();
    this.temporizadorRefresco = window.setInterval(() => this.cargarEstado(), 30000);
  }

  ngOnDestroy(): void {
    if (this.temporizadorRefresco !== null) {
      window.clearInterval(this.temporizadorRefresco);
    }
  }

  recargarManual(): void {
    this.cargarEstado();
  }

  private cargarEstado(): void {
    this.cargando.set(true);
    this.clienteHttp.get<{ success: boolean; data: EstadoSistema }>("/api/estado").subscribe({
      next: (respuesta) => {
        this.estadoActual.set(respuesta.data);
        this.errorRed.set(false);
        this.cargando.set(false);
      },
      error: () => {
        const fechaActual = new Date().toISOString();
        const estadoCaido: EstadoSistema = {
          estadoGeneral: "DOWN",
          actualizadoEn: fechaActual,
          servicios: [
            { clave: "api", estado: "DOWN", descripcion: "Sin conexion" },
            { clave: "baseDeDatos", estado: "DOWN", descripcion: "Sin conexion" },
            { clave: "websocketTerminal", estado: "DOWN", descripcion: "Sin conexion" },
            { clave: "websocketMetricas", estado: "DOWN", descripcion: "Sin conexion" },
            { clave: "websocketNotificaciones", estado: "DOWN", descripcion: "Sin conexion" },
            { clave: "asistenteIa", estado: "DOWN", descripcion: "Sin conexion" },
          ],
        };
        this.estadoActual.set(estadoCaido);
        this.errorRed.set(true);
        this.cargando.set(false);
      },
    });
  }

  protected fechaFormateada(): string {
    const sistema = this.estadoActual();
    if (sistema === null) {
      return "—";
    }
    const fecha = new Date(sistema.actualizadoEn);
    return fecha.toLocaleString();
  }
}
