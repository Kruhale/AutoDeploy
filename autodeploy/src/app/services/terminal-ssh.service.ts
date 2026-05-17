import { Injectable, signal } from "@angular/core";
import { Subject } from "rxjs";

const SECUENCIA_ESCAPE = "[";
const COLOR_VERDE = SECUENCIA_ESCAPE + "32m";
const COLOR_ROJO = SECUENCIA_ESCAPE + "31m";
const COLOR_AMARILLO = SECUENCIA_ESCAPE + "33m";
const COLOR_GRIS = SECUENCIA_ESCAPE + "90m";
const COLOR_RESET = SECUENCIA_ESCAPE + "0m";

@Injectable({ providedIn: "root" })
export class TerminalSshService {

  private websocket: WebSocket | null = null;

  estadoConexion = signal<"desconectado" | "conectando" | "conectado" | "error">("desconectado");
  datosRecibidos = new Subject<string>();

  conectar(servidorId: string): void {
    this.cerrarWebsocketSilenciosamente();

    this.estadoConexion.set("conectando");
    const lineaInicial = COLOR_GRIS + "Estableciendo conexión SSH..." + COLOR_RESET + "\r\n";
    this.datosRecibidos.next(lineaInicial);

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
          const nombre = json.servidor || "servidor";
          const mensajeOk = COLOR_VERDE + "✓ Conectado a " + nombre + COLOR_RESET + "\r\n\r\n";
          servicio.datosRecibidos.next(mensajeOk);
          return;
        }
        if (json.tipo === "error") {
          servicio.estadoConexion.set("error");
          const detalle = json.mensaje || "Error desconocido";
          const mensajeError = "\r\n" + COLOR_ROJO + "✗ " + detalle + COLOR_RESET + "\r\n";
          servicio.datosRecibidos.next(mensajeError);
          return;
        }
      } catch (_ignorado) {
        // No es JSON - es output del terminal
      }

      servicio.datosRecibidos.next(datos);
    };

    this.websocket.onerror = function() {
      servicio.estadoConexion.set("error");
      const mensajeError = "\r\n" + COLOR_ROJO + "✗ Error de WebSocket — el backend no responde" + COLOR_RESET + "\r\n";
      servicio.datosRecibidos.next(mensajeError);
    };

    this.websocket.onclose = function() {
      if (servicio.estadoConexion() !== "error") {
        const mensajeCierre = "\r\n" + COLOR_AMARILLO + "• Conexión cerrada" + COLOR_RESET + "\r\n";
        servicio.datosRecibidos.next(mensajeCierre);
      }
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
    this.cerrarWebsocketSilenciosamente();
    this.estadoConexion.set("desconectado");
  }

  private cerrarWebsocketSilenciosamente(): void {
    if (!this.websocket) {
      return;
    }
    const wsAnterior = this.websocket;
    this.websocket = null;
    wsAnterior.onopen = null;
    wsAnterior.onmessage = null;
    wsAnterior.onerror = null;
    wsAnterior.onclose = null;
    wsAnterior.close();
  }
}
