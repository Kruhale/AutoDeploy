import { Component, OnInit, OnDestroy, signal, HostListener, ElementRef, inject } from "@angular/core";
import { DatePipe } from "@angular/common";
import { TranslateModule } from "@ngx-translate/core";
import { NotificacionService, Notificacion } from "../../../services/notificacion.service";
import { UsuarioService } from "../../../services/usuario.service";
import { Subscription } from "rxjs";

@Component({
  selector: "app-campana-notificaciones",
  standalone: true,
  imports: [DatePipe, TranslateModule],
  templateUrl: "./campana-notificaciones.html",
  styleUrl: "./campana-notificaciones.scss"
})
export class CampanaNotificaciones implements OnInit, OnDestroy {
  private readonly elementoRaiz = inject(ElementRef);

  campanAbierta = signal(false);
  private suscripcion: Subscription | null = null;

  constructor(
    public notificacionService: NotificacionService,
    private usuarioService: UsuarioService
  ) {}

  @HostListener("document:click", ["$event"])
  alClickFueraDelPanel(evento: MouseEvent): void {
    if (!this.campanAbierta()) {
      return;
    }
    const elementoClicado = evento.target as Node;
    if (!this.elementoRaiz.nativeElement.contains(elementoClicado)) {
      this.cerrarCampana();
    }
  }

  ngOnInit(): void {
    const usuarioIdActual = this.usuarioService.usuarioId();
    if (usuarioIdActual) {
      this.cargarNotificaciones(usuarioIdActual);
      this.notificacionService.conectarWebSocket(usuarioIdActual);
    }
  }

  ngOnDestroy(): void {
    this.notificacionService.desconectarWebSocket();
    if (this.suscripcion) {
      this.suscripcion.unsubscribe();
    }
  }

  private async cargarNotificaciones(usuarioId: string): Promise<void> {
    try {
      await this.notificacionService.obtenerConteoNoLeidas(usuarioId);
      await this.notificacionService.listarNoLeidas(usuarioId);
    } catch (error) {
      console.error("Error al cargar notificaciones:", error);
    }
  }

  alternarCampana(): void {
    this.campanAbierta.update((estado) => !estado);
  }

  cerrarCampana(): void {
    this.campanAbierta.set(false);
  }

  async marcarComoLeida(notificacionId: string): Promise<void> {
    try {
      await this.notificacionService.marcarComoLeida(notificacionId);
    } catch (error) {
      console.error("Error al marcar notificación como leída:", error);
    }
  }

  async marcarTodasComoLeidas(): Promise<void> {
    const usuarioIdActual = this.usuarioService.usuarioId();
    if (usuarioIdActual) {
      try {
        await this.notificacionService.marcarTodasComoLeidas(usuarioIdActual);
      } catch (error) {
        console.error("Error al marcar todas como leídas:", error);
      }
    }
  }

  async eliminarNotificacion(notificacionId: string): Promise<void> {
    try {
      await this.notificacionService.eliminarNotificacion(notificacionId);
    } catch (error) {
      console.error("Error al eliminar notificación:", error);
    }
  }

  obtenerColorPorTipo(tipo: string): string {
    const coloresPorTipo: { [key: string]: string } = {
      servidor_desconectado: "rojo",
      deployment: "verde",
      error_critico: "rojo",
      ssl_vencido: "naranja",
      cambio_configuracion: "neutro"
    };
    return coloresPorTipo[tipo] || "neutro";
  }
}
