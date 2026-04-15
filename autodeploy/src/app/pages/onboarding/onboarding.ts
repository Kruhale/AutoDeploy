import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-onboarding',
  imports: [],
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.scss'
})
export class Onboarding {
  metodoAutenticacion = signal<'ssh' | 'password'>('ssh');

  cambiarMetodoAuth(nuevoMetodoDeAutenticacion: 'ssh' | 'password'): void {
    this.metodoAutenticacion.set(nuevoMetodoDeAutenticacion);
  }
}
