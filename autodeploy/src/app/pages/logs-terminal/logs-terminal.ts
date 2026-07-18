import { Component, ElementRef, ViewChild, OnDestroy, afterNextRender, signal } from "@angular/core";
import { UpperCasePipe } from "@angular/common";
import { TranslateModule } from "@ngx-translate/core";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { TerminalSshService } from "../../services/terminal-ssh.service";
import { ServidorService, ServidorRemoto } from "../../services/servidor.service";
import { ActividadService, ActividadLog } from "../../services/actividad.service";
import { Subscription } from "rxjs";

interface EntradaLog {
  hora: string;
  nivel: "info" | "warn" | "ok" | "error" | "crit";
  mensaje: string;
  esDestacado: boolean;
}

@Component({
  selector: "app-logs-terminal",
  imports: [UpperCasePipe, TranslateModule],
  templateUrl: "./logs-terminal.html",
  styleUrl: "./logs-terminal.scss"
})
export class LogsTerminal implements OnDestroy {

  @ViewChild("contenedorTerminal", { static: false }) contenedorTerminal!: ElementRef;

  filtroActivo = signal<"all" | "info" | "warn" | "error">("all");
  busquedaTexto = signal("");
  listaDeServidores = signal<ServidorRemoto[]>([]);
  servidorSeleccionadoId = signal<string | null>(null);
  servidorSeleccionadoNombre = signal<string>("");
  cargandoLogs = signal(true);
  refrescandoFlujo = signal(false);

  entradasDeLog = signal<EntradaLog[]>([]);

  private terminal: Terminal | null = null;
  private fitAddon: FitAddon | null = null;
  private suscripcionDatos: Subscription | null = null;
  private manejadorRedimensionar: (() => void) | null = null;

  constructor(
    public terminalService: TerminalSshService,
    private servidorService: ServidorService,
    private actividadService: ActividadService
  ) {
    const componente = this;

    afterNextRender(function() {
      componente.prepararTerminalXterm();
      componente.cargarServidoresDisponibles();
      componente.cargarActividadReciente();
    });
  }

  private cargarActividadReciente(): void {
    const componente = this;
    this.cargandoLogs.set(true);

    this.actividadService.obtenerRecientes().subscribe({
      next: function(actividades: ActividadLog[]) {
        const entradas = actividades.map(function(actividad) {
          return componente.transformarActividad(actividad);
        });
        componente.entradasDeLog.set(entradas);
        componente.cargandoLogs.set(false);
      },
      error: function() {
        componente.entradasDeLog.set([]);
        componente.cargandoLogs.set(false);
      }
    });
  }

  private transformarActividad(actividad: ActividadLog): EntradaLog {
    const tipoNormalizado = (actividad.tipo || "info").toLowerCase();
    const mapaNiveles: Record<string, EntradaLog["nivel"]> = {
      "info": "info",
      "warning": "warn",
      "warn": "warn",
      "success": "ok",
      "ok": "ok",
      "error": "error",
      "critical": "crit",
      "crit": "crit"
    };
    const nivel = mapaNiveles[tipoNormalizado] || "info";
    const hora = (actividad.fechaCreacion || "").substring(11, 19);

    return {
      hora: hora || new Date().toLocaleTimeString().substring(0, 8),
      nivel: nivel,
      mensaje: actividad.mensaje,
      esDestacado: nivel === "error" || nivel === "crit"
    };
  }

  obtenerColorNivel(nivel: string): string {
    const coloresPorNivel: { [key: string]: string } = {
      "ok": "verde",
      "warn": "naranja",
      "error": "rojo",
      "crit": "rojo"
    };
    return coloresPorNivel[nivel] || "neutro";
  }

  obtenerEntradasFiltradas(): EntradaLog[] {
    const filtro = this.filtroActivo();
    const todasLasEntradas = this.entradasDeLog();
    const textoBusqueda = this.busquedaTexto().toLowerCase();

    let entradasFiltradas = todasLasEntradas;

    if (filtro === "error") {
      entradasFiltradas = entradasFiltradas.filter(function(entrada) {
        return entrada.nivel === "error" || entrada.nivel === "crit";
      });
    } else if (filtro !== "all") {
      entradasFiltradas = entradasFiltradas.filter(function(entrada) {
        return entrada.nivel === filtro;
      });
    }

    if (textoBusqueda) {
      entradasFiltradas = entradasFiltradas.filter(function(entrada) {
        return entrada.mensaje.toLowerCase().includes(textoBusqueda);
      });
    }

    return entradasFiltradas;
  }

  cambiarFiltro(filtro: "all" | "info" | "warn" | "error"): void {
    this.filtroActivo.set(filtro);
  }

  exportarLogs(): void {
    const entradas = this.obtenerEntradasFiltradas();
    const contenidoTexto = entradas.map(function(entrada) {
      return "[" + entrada.hora + "] [" + entrada.nivel.toUpperCase() + "] " + entrada.mensaje;
    }).join("\n");

    const blob = new Blob([contenidoTexto], { type: "text/plain" });
    const enlaceDescarga = document.createElement("a");
    enlaceDescarga.href = URL.createObjectURL(blob);
    enlaceDescarga.download = "logs-export.txt";
    enlaceDescarga.click();
    URL.revokeObjectURL(enlaceDescarga.href);
  }

  reiniciarFlujo(): void {
    this.refrescandoFlujo.set(true);
    const componente = this;

    this.actividadService.obtenerRecientes().subscribe({
      next: function(actividades: ActividadLog[]) {
        const entradas = actividades.map(function(actividad) {
          return componente.transformarActividad(actividad);
        });
        componente.entradasDeLog.set(entradas);
        componente.refrescandoFlujo.set(false);
      },
      error: function() {
        componente.refrescandoFlujo.set(false);
      }
    });
  }

  private prepararTerminalXterm(): void {
    if (!this.contenedorTerminal || this.terminal) {
      return;
    }

    const componente = this;

    this.terminal = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      theme: {
        background: "#0d0d0d",
        foreground: "#e8e0d4",
        cursor: "#e2b93d",
        selectionBackground: "#e2b93d33"
      }
    });

    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.open(this.contenedorTerminal.nativeElement);
    this.fitAddon.fit();

    this.terminal.onData(function(datos: string) {
      componente.terminalService.enviarEntrada(datos);
    });

    this.suscripcionDatos = this.terminalService.datosRecibidos.subscribe(function(datos: string) {
      if (!componente.terminal) {
        return;
      }
      componente.terminal.write(datos, function() {
        if (!componente.terminal) {
          return;
        }
        const colsActuales = componente.terminal.cols;
        const filasActuales = componente.terminal.rows;
        if (colsActuales > 1) {
          componente.terminal.resize(colsActuales - 1, filasActuales);
          componente.terminal.resize(colsActuales, filasActuales);
        }
      });
    });

    this.manejadorRedimensionar = function() {
      if (componente.fitAddon && componente.terminal) {
        componente.fitAddon.fit();
        componente.terminalService.enviarRedimensionar(
          componente.terminal.cols,
          componente.terminal.rows
        );
      }
    };
    window.addEventListener("resize", this.manejadorRedimensionar);
  }

  private cargarServidoresDisponibles(): void {
    const componente = this;

    this.servidorService.listar().subscribe({
      next: function(servidores: ServidorRemoto[]) {
        componente.listaDeServidores.set(servidores);

        if (servidores.length === 1) {
          const unicoServidor = servidores[0];
          componente.servidorSeleccionadoId.set(unicoServidor.id);
          componente.servidorSeleccionadoNombre.set(unicoServidor.nombre);
        }
      }
    });
  }

  conectarServidorSeleccionado(): void {
    const idSeleccionado = this.servidorSeleccionadoId();
    if (!idSeleccionado) {
      return;
    }
    const servidor = this.listaDeServidores().find(function(s) { return s.id === idSeleccionado; });
    if (!servidor) {
      return;
    }
    this.iniciarSesionConServidor(servidor.id, servidor.nombre);
  }

  cambiarServidor(evento: Event): void {
    const seleccionado = (evento.target as HTMLSelectElement).value;
    const servidor = this.listaDeServidores().find(function(s) { return s.id === seleccionado; });
    if (!servidor) {
      this.servidorSeleccionadoId.set(null);
      this.servidorSeleccionadoNombre.set("");
      return;
    }
    this.servidorSeleccionadoId.set(servidor.id);
    this.servidorSeleccionadoNombre.set(servidor.nombre);
  }

  private iniciarSesionConServidor(servidorId: string, nombreServidor: string): void {
    this.servidorSeleccionadoId.set(servidorId);
    this.servidorSeleccionadoNombre.set(nombreServidor);

    if (this.terminal) {
      this.terminal.reset();
    }
    this.terminalService.conectar(servidorId);
  }

  ngOnDestroy(): void {
    this.terminalService.desconectar();

    if (this.suscripcionDatos) {
      this.suscripcionDatos.unsubscribe();
      this.suscripcionDatos = null;
    }

    if (this.terminal) {
      this.terminal.dispose();
      this.terminal = null;
    }

    if (this.manejadorRedimensionar) {
      window.removeEventListener("resize", this.manejadorRedimensionar);
      this.manejadorRedimensionar = null;
    }

    this.fitAddon = null;
  }
}
