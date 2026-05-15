import { Component, signal, computed, Signal } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { UpperCasePipe, DatePipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { AuthService } from "../../services/auth.service";
import { PlanService, PLANES, PlanId } from "../../services/plan.service";
import { UsuarioService } from "../../services/usuario.service";

@Component({
  selector: "app-cuenta",
  imports: [RouterLink, UpperCasePipe, DatePipe, FormsModule],
  templateUrl: "./cuenta.html",
  styleUrl: "./cuenta.scss"
})
export class Cuenta {
  readonly planes = PLANES;

  nombreEditable = signal("");
  emailEditable = signal("");
  guardando = signal(false);
  mensajeGuardado = signal("");
  cancelando = signal(false);
  inicialDelNombre: Signal<string>;

  suscripcionCancelada = computed(function(this: Cuenta) {
    return !!this.usuarioService.fechaFinSuscripcion();
  }.bind(this));

  fechaFinFormateada = computed(function(this: Cuenta) {
    const fecha = this.usuarioService.fechaFinSuscripcion();
    if (!fecha) return null;
    return new Date(fecha);
  }.bind(this));

  constructor(
    readonly authService: AuthService,
    readonly planService: PlanService,
    readonly usuarioService: UsuarioService,
    private router: Router
  ) {
    this.nombreEditable.set(this.usuarioService.nombre());
    this.emailEditable.set(this.usuarioService.email());

    const componente = this;
    this.inicialDelNombre = computed(function() {
      const nombre = componente.usuarioService.nombre();
      if (!nombre) return "?";
      return nombre.charAt(0).toUpperCase();
    });
  }

  cambiarPlan(id: PlanId): void {
    const planActual = this.planService.planActual();

    if (id === "free" && planActual !== "free") {
      this.cancelarSuscripcion();
      return;
    }

    if (id !== "free" && id !== planActual) {
      this.router.navigate(["/app/pago"], { queryParams: { plan: id } });
      return;
    }
  }

  async cancelarSuscripcion(): Promise<void> {
    this.cancelando.set(true);
    try {
      await this.usuarioService.cancelarSuscripcion();
    } catch (error) {
      console.error("Error al cancelar suscripción:", error);
    } finally {
      this.cancelando.set(false);
    }
  }

  async guardarCambios(): Promise<void> {
    const nombre = this.nombreEditable();
    const email = this.emailEditable();

    if (!nombre || !email) return;

    this.guardando.set(true);
    this.mensajeGuardado.set("");

    try {
      await this.usuarioService.actualizarPerfil(nombre, email);
      this.mensajeGuardado.set("Changes saved");
    } catch (error: any) {
      this.mensajeGuardado.set("Error saving changes");
    } finally {
      this.guardando.set(false);
    }
  }

  cerrarSesion(): void {
    this.usuarioService.limpiar();
    this.authService.logout();
    this.router.navigate(["/"]);
  }
}
