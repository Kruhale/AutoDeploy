import { Component, OnInit, OnDestroy, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { NotificacionService, Notificacion } from "../../../services/notificacion.service";
import { UsuarioService } from "../../../services/usuario.service";
import { Subscription } from "rxjs";

@Component({
	selector: "app-campana-notificaciones",
	standalone: true,
	imports: [CommonModule],
	templateUrl: "./campana-notificaciones.html",
	styleUrl: "./campana-notificaciones.scss"
})
export class CampanaNotificaciones implements OnInit, OnDestroy {

	campanAbierta = signal(false);
	private suscripcion: Subscription | null = null;

	constructor(
		public notificacionService: NotificacionService,
		private usuarioService: UsuarioService
	) {}

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
		this.campanAbierta.update(estado => !estado);
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

	obtenerIconoPorTipo(tipo: string): string {
		const iconosPorTipo: { [key: string]: string } = {
			"servidor_desconectado": "fa-server",
			"deployment": "fa-rocket",
			"error_critico": "fa-triangle-exclamation",
			"ssl_vencido": "fa-shield",
			"cambio_configuracion": "fa-gear"
		};
		return iconosPorTipo[tipo] || "fa-bell";
	}
}
