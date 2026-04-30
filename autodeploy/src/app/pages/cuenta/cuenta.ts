import { Component, signal, computed, Signal } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { UpperCasePipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { AuthService } from "../../services/auth.service";
import { PlanService, PLANES, PlanId } from "../../services/plan.service";
import { UsuarioService } from "../../services/usuario.service";

@Component({
  selector: "app-cuenta",
  imports: [RouterLink, UpperCasePipe, FormsModule],
  templateUrl: "./cuenta.html",
  styleUrl: "./cuenta.scss"
})
export class Cuenta {
  readonly planes = PLANES;

  nombreEditable = signal("");
  emailEditable = signal("");
  guardando = signal(false);
  mensajeGuardado = signal("");
  inicialDelNombre: Signal<string>;

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
      if (!nombre) {
        return "?";
      }
      return nombre.charAt(0).toUpperCase();
    });
  }

  cambiarPlan(id: PlanId): void {
    this.planService.activarPlan(id);
  }

  async guardarCambios(): Promise<void> {
    const nombre = this.nombreEditable();
    const email = this.emailEditable();

    if (!nombre || !email) {
      return;
    }

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
