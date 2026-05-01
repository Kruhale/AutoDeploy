import { Component, signal } from "@angular/core";
import { UpperCasePipe } from "@angular/common";

interface EntradaLog {
  hora: string;
  nivel: "info" | "warn" | "ok" | "error" | "crit";
  mensaje: string;
  esDestacado: boolean;
}

interface LineaTerminal {
  tipo: "prompt" | "salida";
  contenido: string;
}

@Component({
  selector: "app-logs-terminal",
  imports: [UpperCasePipe],
  templateUrl: "./logs-terminal.html",
  styleUrl: "./logs-terminal.scss"
})
export class LogsTerminal {
  filtroActivo = signal<"all" | "info" | "warn" | "error">("all");
  busquedaTexto = signal("");

  entradasDeLog = signal<EntradaLog[]>([
    { hora: "14:22:01", nivel: "info", mensaje: "Iniciando proceso de despliegue en rama main", esDestacado: false },
    { hora: "14:22:05", nivel: "info", mensaje: "Entorno detectado: Docker Desktop Linux", esDestacado: false },
    { hora: "14:22:12", nivel: "warn", mensaje: "Uso de memoria excediendo el 80% en contenedor de compilación", esDestacado: false },
    { hora: "14:22:15", nivel: "info", mensaje: "Inyectando variables de entorno desde Vault...", esDestacado: false },
    { hora: "14:23:01", nivel: "ok", mensaje: "Capa de persistencia verificada con éxito (RDS Connectivity OK)", esDestacado: false },
    { hora: "14:23:45", nivel: "error", mensaje: "Falló la validación del certificado SSL en el nodo alterno", esDestacado: true },
    { hora: "14:23:48", nivel: "crit", mensaje: "Reintentando conexión con gateway secundario (Intento 1/3)", esDestacado: false },
  ]);

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

  lineasDeTerminal = signal<LineaTerminal[]>([
    { tipo: "prompt", contenido: "ls -la build/outputs" },
    { tipo: "salida", contenido: "total 24k" },
    { tipo: "salida", contenido: "drwxr-xr-x 2 root root 4096 Oct 24 14:22 ." },
    { tipo: "salida", contenido: "drwxr-xr-x 5 root root 4096 Oct 24 14:20 .." },
    { tipo: "salida", contenido: "-rw-r--r-- 1 root root 8234 Oct 24 14:22 main.min.js" },
    { tipo: "salida", contenido: "-rw-r--r-- 1 root root 2121 Oct 24 14:22 styles.css" },
    { tipo: "prompt", contenido: "docker ps --format \"table Names\\tStatus\"" },
    { tipo: "salida", contenido: "NAMES           STATUS" },
    { tipo: "salida", contenido: "api_gateway     Up 14 minutes (healthy)" },
    { tipo: "salida", contenido: "worker_service  Up 2 minutes" },
    { tipo: "salida", contenido: "redis_cache     Up 2 hours" },
  ]);

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
    this.entradasDeLog.set([]);

    const componente = this;
    setTimeout(function() {
      componente.entradasDeLog.set([
        { hora: new Date().toLocaleTimeString().substring(0, 8), nivel: "info", mensaje: "Flow restarted successfully", esDestacado: false },
        { hora: new Date().toLocaleTimeString().substring(0, 8), nivel: "ok", mensaje: "All services healthy", esDestacado: false },
      ]);
    }, 1500);
  }
}
