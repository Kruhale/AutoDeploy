import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  passwordEsVisible = signal(false);
  mensajeDeErrorVisible = signal(false);

  constructor(private router: Router, private authService: AuthService) {}

  alternarVisibilidadPassword(): void {
    this.passwordEsVisible.update(function(estadoActualDeVisibilidad) {
      return !estadoActualDeVisibilidad;
    });
  }

  iniciarSesion(): void {
    this.authService.login();
    this.router.navigate(['/app']);
  }
}
