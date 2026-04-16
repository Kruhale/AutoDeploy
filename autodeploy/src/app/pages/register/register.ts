import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-register',
  imports: [RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class Register {
  passwordEsVisible = signal(false);
  confirmPasswordEsVisible = signal(false);
  mensajeDeErrorVisible = signal(false);

  constructor(private router: Router) {}

  alternarVisibilidadPassword(): void {
    this.passwordEsVisible.update(function(estadoActualDeVisibilidad) {
      return !estadoActualDeVisibilidad;
    });
  }

  alternarVisibilidadConfirmPassword(): void {
    this.confirmPasswordEsVisible.update(function(estadoActualDeVisibilidad) {
      return !estadoActualDeVisibilidad;
    });
  }

  crearCuenta(): void {
    this.router.navigate(['/app']);
  }
}
