import { Component, OnInit, OnDestroy, signal, HostListener, ElementRef, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { TranslateModule } from "@ngx-translate/core";
import { NotificacionService, Notificacion } from "../../../services/notificacion.service";
import { UsuarioService } from "../../../services/usuario.service";
import { Subscription } from "rxjs";

@Component({
	selector: "app-campana-notificaciones",
	standalone: true,
	imports: [CommonModule, TranslateModule],
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
		} catch {
			// La campana se queda en estado vacio; un reintento ocurrira al recargar la pagina.
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
		} catch {
			// Si la peticion falla, la notificacion queda sin marcar; el proximo click vuelve a intentarlo.
		}
	}

	async marcarTodasComoLeidas(): Promise<void> {
		const usuarioIdActual = this.usuarioService.usuarioId();
		if (usuarioIdActual) {
			try {
				await this.notificacionService.marcarTodasComoLeidas(usuarioIdActual);
			} catch {
				// Igual que el caso individual: silencioso por UX, se reintenta al volver a hacer click.
			}
		}
	}

	async eliminarNotificacion(notificacionId: string): Promise<void> {
		try {
			await this.notificacionService.eliminarNotificacion(notificacionId);
		} catch {
			// El item se queda en la lista; recargar la campana lo refrescara.
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
