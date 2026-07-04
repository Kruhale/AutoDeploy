import { Injectable, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, Subject } from "rxjs";

export interface Notificacion {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string;
  leida: boolean;
  fechaCreacion: string;
}

interface RespuestaApi<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({ providedIn: "root" })
export class NotificacionService {
  private readonly urlBase = "/api/notificaciones";
  private readonly wsUrl = (window.location.protocol === "https:" ? "wss:" : "ws:") + "//" + window.location.host + "/ws/notificaciones";

  notificacionesDelUsuario = signal<Notificacion[]>([]);
  notificacionesNoLeidas = signal<Notificacion[]>([]);
  conteoNoLeidas = signal(0);

  private webSocketPrincipal: WebSocket | null = null;
  private notificacionRecibida = new Subject<Notificacion>();

  constructor(private http: HttpClient) {}

  conectarWebSocket(usuarioId: string): void {
    const tokenJwt = sessionStorage.getItem("token") || localStorage.getItem("token") || "";
    const urlConectada = `${this.wsUrl}/${usuarioId}?token=${encodeURIComponent(tokenJwt)}`;
    this.webSocketPrincipal = new WebSocket(urlConectada);

    const servicio = this;
    this.webSocketPrincipal.onmessage = function manejarMensajeNotificacion(evento) {
      try {
        const notificacionRecibida: Notificacion = JSON.parse(evento.data);
        servicio.notificacionRecibida.next(notificacionRecibida);
        servicio.agregarNotificacionLocal(notificacionRecibida);
      } catch (errorParse) {
        console.error("Error parseando notificacion desde WebSocket:", errorParse);
      }
    };

    this.webSocketPrincipal.onerror = function manejarErrorNotificacion(error) {
      console.error("Error en WebSocket de notificaciones:", error);
    };
  }

  desconectarWebSocket(): void {
    if (this.webSocketPrincipal) {
      this.webSocketPrincipal.close();
      this.webSocketPrincipal = null;
    }
  }

  obtenerNotificacionesRecibidas(): Observable<Notificacion> {
    return this.notificacionRecibida.asObservable();
  }

  private agregarNotificacionLocal(notificacion: Notificacion): void {
    const notificacionesActuales = this.notificacionesDelUsuario();
    this.notificacionesDelUsuario.set([notificacion, ...notificacionesActuales]);

    if (!notificacion.leida) {
      const noLeidasActuales = this.notificacionesNoLeidas();
      this.notificacionesNoLeidas.set([notificacion, ...noLeidasActuales]);
      this.conteoNoLeidas.update((contador) => contador + 1);
    }
  }

  listarPorUsuario(usuarioId: string): Promise<Notificacion[]> {
    const servicioActual = this;
    return new Promise(function (resolver, rechazar) {
      servicioActual.http.get<RespuestaApi<Notificacion[]>>(`${servicioActual.urlBase}/usuario/${usuarioId}`).subscribe({
        next: function (respuesta: RespuestaApi<Notificacion[]>) {
          servicioActual.notificacionesDelUsuario.set(respuesta.data);
          resolver(respuesta.data);
        },
        error: function (error: any) {
          rechazar(error);
        }
      });
    });
  }

  listarNoLeidas(usuarioId: string): Promise<Notificacion[]> {
    const servicioActual = this;
    return new Promise(function (resolver, rechazar) {
      servicioActual.http.get<RespuestaApi<Notificacion[]>>(`${servicioActual.urlBase}/usuario/${usuarioId}/no-leidas`).subscribe({
        next: function (respuesta: RespuestaApi<Notificacion[]>) {
          servicioActual.notificacionesNoLeidas.set(respuesta.data);
          resolver(respuesta.data);
        },
        error: function (error: any) {
          rechazar(error);
        }
      });
    });
  }

  obtenerConteoNoLeidas(usuarioId: string): Promise<number> {
    const servicioActual = this;
    return new Promise(function (resolver, rechazar) {
      servicioActual.http.get<RespuestaApi<number>>(`${servicioActual.urlBase}/usuario/${usuarioId}/contar-no-leidas`).subscribe({
        next: function (respuesta: RespuestaApi<number>) {
          servicioActual.conteoNoLeidas.set(respuesta.data);
          resolver(respuesta.data);
        },
        error: function (error: any) {
          rechazar(error);
        }
      });
    });
  }

  marcarComoLeida(notificacionId: string): Promise<void> {
    const servicioActual = this;
    return new Promise(function (resolver, rechazar) {
      servicioActual.http.put<RespuestaApi<void>>(`${servicioActual.urlBase}/${notificacionId}/marcar-leida`, {}).subscribe({
        next: function () {
          servicioActual.actualizarNotificacionLocal(notificacionId, true);
          resolver();
        },
        error: function (error: any) {
          rechazar(error);
        }
      });
    });
  }

  marcarTodasComoLeidas(usuarioId: string): Promise<void> {
    const servicioActual = this;
    return new Promise(function (resolver, rechazar) {
      servicioActual.http.put<RespuestaApi<void>>(`${servicioActual.urlBase}/usuario/${usuarioId}/marcar-todas-leidas`, {}).subscribe({
        next: function () {
          const notificacionesActuales = servicioActual.notificacionesDelUsuario();
          const notificacionesActualizadas = notificacionesActuales.map((notif) => ({
            ...notif,
            leida: true
          }));
          servicioActual.notificacionesDelUsuario.set(notificacionesActualizadas);
          servicioActual.notificacionesNoLeidas.set([]);
          servicioActual.conteoNoLeidas.set(0);
          resolver();
        },
        error: function (error: any) {
          rechazar(error);
        }
      });
    });
  }

  eliminarNotificacion(notificacionId: string): Promise<void> {
    const servicioActual = this;
    return new Promise(function (resolver, rechazar) {
      servicioActual.http.delete<RespuestaApi<void>>(`${servicioActual.urlBase}/${notificacionId}`).subscribe({
        next: function () {
          const notificacionesActuales = servicioActual.notificacionesDelUsuario();
          const notificacionesFiltradas = notificacionesActuales.filter((notif) => notif.id !== notificacionId);
          servicioActual.notificacionesDelUsuario.set(notificacionesFiltradas);

          const noLeidasActuales = servicioActual.notificacionesNoLeidas();
          const noLeidasFiltradas = noLeidasActuales.filter((notif) => notif.id !== notificacionId);
          servicioActual.notificacionesNoLeidas.set(noLeidasFiltradas);

          const notificacionAEliminar = notificacionesActuales.find((notif) => notif.id === notificacionId);
          if (notificacionAEliminar && !notificacionAEliminar.leida) {
            servicioActual.conteoNoLeidas.update((contador) => Math.max(0, contador - 1));
          }

          resolver();
        },
        error: function (error: any) {
          rechazar(error);
        }
      });
    });
  }

  private actualizarNotificacionLocal(notificacionId: string, ahora_Leida: boolean): void {
    const notificacionesActuales = this.notificacionesDelUsuario();
    const notificacionActualizada = notificacionesActuales.map((notif) => (notif.id === notificacionId ? { ...notif, leida: ahora_Leida } : notif));
    this.notificacionesDelUsuario.set(notificacionActualizada);

    if (ahora_Leida) {
      const noLeidasActuales = this.notificacionesNoLeidas();
      const noLeidasFiltradas = noLeidasActuales.filter((notif) => notif.id !== notificacionId);
      this.notificacionesNoLeidas.set(noLeidasFiltradas);
      this.conteoNoLeidas.update((contador) => Math.max(0, contador - 1));
    }
  }
}
