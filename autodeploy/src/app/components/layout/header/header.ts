import { Component, signal, computed, inject, Signal, HostListener } from "@angular/core";
import { RouterLink } from "@angular/router";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { AuthService } from "../../../services/auth.service";
import { ThemeService } from "../../../services/theme.service";

interface NotificacionMock {
  claveMensaje: string;
  claveTiempo: string;
  parametrosTiempo: { [clave: string]: number };
  leida: boolean;
}

interface Notificacion {
  mensaje: string;
  fecha: string;
  leida: boolean;
}

@Component({
  selector: "app-header",
  imports: [RouterLink, TranslateModule],
  templateUrl: "./header.html",
  styleUrl: "./header.scss",
})
export class Header {
  notificacionesAbiertas = signal(false);
  menuMovilAbierto = signal(false);

  private notificacionesMock = signal<NotificacionMock[]>([
    { claveMensaje: "header.notif.servidorOffline", claveTiempo: "header.tiempo.haceMin", parametrosTiempo: { min: 5 }, leida: false },
    { claveMensaje: "header.notif.deployCompleted", claveTiempo: "header.tiempo.haceMin", parametrosTiempo: { min: 23 }, leida: false },
    { claveMensaje: "header.notif.cpuExcedida", claveTiempo: "header.tiempo.haceHoras", parametrosTiempo: { h: 1 }, leida: false },
    { claveMensaje: "header.notif.sslRenovado", claveTiempo: "header.tiempo.haceHoras", parametrosTiempo: { h: 3 }, leida: true },
  ]);

  listaNotificaciones: Signal<Notificacion[]>;
  contadorSinLeer: Signal<number>;

  readonly authService = inject(AuthService);
  readonly themeService = inject(ThemeService);
  private translate = inject(TranslateService);

  constructor() {
    const componente = this;

    this.listaNotificaciones = computed(function() {
      const notificacionesActuales = componente.notificacionesMock();
      const notificacionesTraducidas = notificacionesActuales.map(function(notificacionMock) {
        const mensajeTraducido = componente.translate.instant(notificacionMock.claveMensaje);
        const fechaTraducida = componente.translate.instant(notificacionMock.claveTiempo, notificacionMock.parametrosTiempo);
        return {
          mensaje: mensajeTraducido,
          fecha: fechaTraducida,
          leida: notificacionMock.leida,
        };
      });
      return notificacionesTraducidas;
    });

    this.contadorSinLeer = computed(function() {
      const todasLasNotificaciones = componente.notificacionesMock();
      const notificacionesSinLeer = todasLasNotificaciones.filter(function(notificacion) {
        return !notificacion.leida;
      });
      return notificacionesSinLeer.length;
    });
  }

  alternarNotificaciones(): void {
    this.notificacionesAbiertas.update(function(estadoActual) {
      return !estadoActual;
    });
  }

  alternarMenuMovil(): void {
    this.menuMovilAbierto.update(function(estadoActual) {
      return !estadoActual;
    });
  }

  cerrarMenuMovil(): void {
    this.menuMovilAbierto.set(false);
  }

  marcarTodasComoLeidas(): void {
    this.notificacionesMock.update(function(listaActual) {
      return listaActual.map(function(notificacion) {
        return { ...notificacion, leida: true };
      });
    });
  }

  @HostListener("document:keydown.escape")
  onEscape(): void {
    this.menuMovilAbierto.set(false);
    this.notificacionesAbiertas.set(false);
  }
}
