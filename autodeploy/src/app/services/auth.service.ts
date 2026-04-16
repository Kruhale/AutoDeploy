import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  estaLogueado = signal(!!sessionStorage.getItem('usuarioId'));

  login(): void {
    this.estaLogueado.set(!!sessionStorage.getItem('usuarioId'));
  }

  logout(): void {
    this.estaLogueado.set(false);
  }
}
