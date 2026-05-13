import { Component, input, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { UsuarioService } from '../../../services/usuario.service';
import { PlanService } from '../../../services/plan.service';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, TranslateModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class Sidebar {
  abierta = input(false);
  colapsada = signal(false);

  constructor(
    public usuarioService: UsuarioService,
    public planService: PlanService
  ) {}

  alternarColapso(): void {
    this.colapsada.update(function(estadoActual) {
      return !estadoActual;
    });
  }
}
