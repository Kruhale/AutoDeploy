import { Component, signal, computed, Signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { AuthService } from "../../../services/auth.service";
import { ThemeService } from "../../../services/theme.service";

interface Notificacion {
  mensaje: string;
  fecha: string;
  leida: boolean;
}

@Component({
  selector: "app-header",
  imports: [RouterLink],
  templateUrl: "./header.html",
  styleUrl: "./header.scss",
})
export class Header {
  notificacionesAbiertas = signal(false);

  listaNotificaciones = signal<Notificacion[]>([
    { mensaje: "Server vps-prod-01 went offline", fecha: "hace 5 min", leida: false },
    { mensaje: "Deployment to production completed", fecha: "hace 23 min", leida: false },
    { mensaje: "CPU usage exceeded 90% on vps-dev-02", fecha: "hace 1 h", leida: false },
    { mensaje: "SSL certificate renewed for example.com", fecha: "hace 3 h", leida: true },
  ]);

  contadorSinLeer: Signal<number>;

  constructor(
    public authService: AuthService,
    public themeService: ThemeService,
  ) {
    const componente = this;

    this.contadorSinLeer = computed(function() {
      const todasLasNotificaciones = componente.listaNotificaciones();
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

  marcarTodasComoLeidas(): void {
    this.listaNotificaciones.update(function(listaActual) {
      return listaActual.map(function(notificacion) {
        return { ...notificacion, leida: true };
      });
    });
  }
}
