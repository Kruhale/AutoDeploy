import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { PlanService, PLANES, PlanId } from '../../services/plan.service';

@Component({
  selector: 'app-cuenta',
  imports: [RouterLink, UpperCasePipe],
  templateUrl: './cuenta.html',
  styleUrl: './cuenta.scss'
})
export class Cuenta {
  readonly planes = PLANES;

  constructor(
    readonly authService: AuthService,
    readonly planService: PlanService,
    private router: Router
  ) {}

  cambiarPlan(id: PlanId): void {
    this.planService.activarPlan(id);
  }

  cerrarSesion(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
