import { Component, computed, Signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UsuarioService } from '../../services/usuario.service';

@Component({
  selector: 'app-confirmar-free',
  imports: [RouterLink],
  templateUrl: './confirmar-free.html',
  styleUrl: './confirmar-free.scss',
})
export class ConfirmarFree {
  estaLogueado: Signal<boolean>;
  planActual: Signal<string>;
  esBajada: Signal<boolean>;

  constructor(
    private router: Router,
    private authService: AuthService,
    private usuarioService: UsuarioService,
  ) {
    const componente = this;

    this.estaLogueado = computed(function () {
      return componente.authService.estaLogueado();
    });

    this.planActual = computed(function () {
      return componente.usuarioService.plan() || '';
    });

    this.esBajada = computed(function () {
      const plan = componente.planActual();
      return componente.estaLogueado() && (plan === 'pro' || plan === 'business');
    });
  }

  confirmar(): void {
    if (!this.estaLogueado()) {
      this.router.navigate(['/register']);
      return;
    }
    this.router.navigate(['/app/dashboard']);
  }

  cancelar(): void {
    this.router.navigate(['/']);
  }
}
