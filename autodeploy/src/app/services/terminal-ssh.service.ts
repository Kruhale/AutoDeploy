import { Injectable, signal } from "@angular/core";
import { Subject } from "rxjs";

@Injectable({ providedIn: "root" })
export class TerminalSshService {

  private websocket: WebSocket | null = null;

  estadoConexion = signal<"desconectado" | "conectando" | "conectado" | "error">("desconectado");
  datosRecibidos = new Subject<string>();

  conectar(servidorId: string): void {
    if (this.websocket) {
      this.desconectar();
    }

    this.estadoConexion.set("conectando");
    const protocolo = window.location.protocol === "https:" ? "wss:" : "ws:";
    this.websocket = new WebSocket(protocolo + "//" + window.location.host + "/ws/terminal");

    const servicio = this;

    this.websocket.onopen = function() {
      const mensajeConexion = JSON.stringify({
        tipo: "connect",
        servidorId: servidorId
      });
      servicio.websocket!.send(mensajeConexion);
    };

    this.websocket.onmessage = function(evento: MessageEvent) {
      const datos = evento.data;

      try {
        const json = JSON.parse(datos);
        if (json.tipo === "connected") {
          servicio.estadoConexion.set("conectado");
          return;
        }
        if (json.tipo === "error") {
          servicio.estadoConexion.set("error");
          return;
        }
      } catch (_ignorado) {
        // No es JSON - es output del terminal
      }

      servicio.datosRecibidos.next(datos);
    };

    this.websocket.onerror = function() {
      servicio.estadoConexion.set("error");
    };

    this.websocket.onclose = function() {
      servicio.estadoConexion.set("desconectado");
      servicio.websocket = null;
    };
  }

  enviarEntrada(datos: string): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      const mensaje = JSON.stringify({ tipo: "input", datos: datos });
      this.websocket.send(mensaje);
    }
  }

  enviarRedimensionar(columnas: number, filas: number): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      const mensaje = JSON.stringify({ tipo: "resize", columnas: columnas, filas: filas });
      this.websocket.send(mensaje);
    }
  }

  desconectar(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.estadoConexion.set("desconectado");
  }
}
