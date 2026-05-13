import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  estaLogueado = signal(sessionStorage.getItem('logueado') === 'true');

  login(): void {
    sessionStorage.setItem('logueado', 'true');
    this.estaLogueado.set(true);
  }

  logout(): void {
    sessionStorage.removeItem('logueado');
    this.estaLogueado.set(false);
  }
}
