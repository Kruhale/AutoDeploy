import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { NotificacionService, Notificacion } from "../../../services/notificacion.service";
import { Subscription } from "rxjs";

interface ToastInterno {
	notificacion: Notificacion;
	id: string;
}

@Component({
	selector: "app-toast-notificaciones",
	standalone: true,
	imports: [CommonModule],
	templateUrl: "./toast-notificaciones.html",
	styleUrl: "./toast-notificaciones.scss"
})
export class ToastNotificaciones implements OnInit, OnDestroy {

	toastsMostrados: ToastInterno[] = [];
	private suscripcion: Subscription | null = null;

	constructor(private notificacionService: NotificacionService) {}

	ngOnInit(): void {
		const componenteActual = this;
		this.suscripcion = this.notificacionService.obtenerNotificacionesRecibidas()
			.subscribe(function(notificacionRecibida: Notificacion) {
				componenteActual.agregarToast(notificacionRecibida);
			});
	}

	ngOnDestroy(): void {
		if (this.suscripcion) {
			this.suscripcion.unsubscribe();
		}
	}

	private agregarToast(notificacion: Notificacion): void {
		const idUnico = `toast-${Date.now()}-${Math.random()}`;
		const toastNuevo: ToastInterno = { notificacion, id: idUnico };

		this.toastsMostrados.push(toastNuevo);

		setTimeout(() => {
			this.toastsMostrados = this.toastsMostrados.filter(toast => toast.id !== idUnico);
		}, 3000);
	}

	cerrarToast(idToast: string): void {
		this.toastsMostrados = this.toastsMostrados.filter(toast => toast.id !== idToast);
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

	obtenerClasePorTipo(tipo: string): string {
		const clasesPorTipo: { [key: string]: string } = {
			"servidor_desconectado": "toast--error",
			"deployment": "toast--info",
			"error_critico": "toast--error",
			"ssl_vencido": "toast--advertencia",
			"cambio_configuracion": "toast--info"
		};
		return clasesPorTipo[tipo] || "toast--info";
	}
}
