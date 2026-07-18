import { Component, OnInit, OnDestroy, inject } from "@angular/core";
import { TranslateModule } from "@ngx-translate/core";
import { NotificacionService, Notificacion } from "../../../services/notificacion.service";
import { Subscription } from "rxjs";

interface ToastInterno {
	notificacion: Notificacion;
	id: string;
}

@Component({
	selector: "app-toast-notificaciones",
	standalone: true,
	imports: [TranslateModule],
	templateUrl: "./toast-notificaciones.html",
	styleUrl: "./toast-notificaciones.scss"
})
export class ToastNotificaciones implements OnInit, OnDestroy {

	toastsMostrados: ToastInterno[] = [];
	private suscripcion: Subscription | null = null;

	private notificacionService = inject(NotificacionService);

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

		// 5s: con 3s los avisos desaparecian antes de poder leerse
		const componenteActual = this;
		setTimeout(function() {
			componenteActual.toastsMostrados = componenteActual.toastsMostrados.filter(function(toast) {
				return toast.id !== idUnico;
			});
		}, 5000);
	}

	cerrarToast(idToast: string): void {
		this.toastsMostrados = this.toastsMostrados.filter(function(toast) {
			return toast.id !== idToast;
		});
	}

	obtenerColorPorTipo(tipo: string): string {
		const coloresPorTipo: { [key: string]: string } = {
			"servidor_desconectado": "rojo",
			"deployment": "verde",
			"error_critico": "rojo",
			"ssl_vencido": "naranja",
			"cambio_configuracion": "neutro"
		};
		return coloresPorTipo[tipo] || "neutro";
	}
}
