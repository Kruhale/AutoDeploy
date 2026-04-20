import { Component, signal, computed, inject, Signal, HostListener } from "@angular/core";
import { RouterLink } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import { AuthService } from "../../../services/auth.service";
import { ThemeService } from "../../../services/theme.service";

interface NotificacionMock {
  claveMensaje: string;
  leida: boolean;
}

@Component({
  selector: "app-header",
  imports: [RouterLink, TranslateModule],
  templateUrl: "./header.html",
  styleUrl: "./header.scss"
})
export class Header {
  menuMovilAbierto = signal(false);

  // Solo alimenta el puntito de aviso del boton MENU; el detalle de las
  // notificaciones vive dentro de la app.
  private notificacionesMock = signal<NotificacionMock[]>([
    { claveMensaje: "header.notif.servidorOffline", leida: false },
    { claveMensaje: "header.notif.deployCompleted", leida: false },
    { claveMensaje: "header.notif.cpuExcedida", leida: false },
    { claveMensaje: "header.notif.sslRenovado", leida: true }
  ]);

  contadorSinLeer: Signal<number>;

  readonly authService = inject(AuthService);
  readonly themeService = inject(ThemeService);

  constructor() {
    const componente = this;

    this.contadorSinLeer = computed(function () {
      const todasLasNotificaciones = componente.notificacionesMock();
      const notificacionesSinLeer = todasLasNotificaciones.filter(function (notificacion) {
        return !notificacion.leida;
      });
      return notificacionesSinLeer.length;
    });
  }

  alternarMenuMovil(): void {
    this.menuMovilAbierto.update(function (estadoActual) {
      return !estadoActual;
    });
  }

  cerrarMenuMovil(): void {
    this.menuMovilAbierto.set(false);
  }

  @HostListener("document:keydown.escape")
  onEscape(): void {
    this.menuMovilAbierto.set(false);
  }
}
