import { Component, signal, inject } from "@angular/core";
import { NavigationEnd, Router, RouterLink, RouterOutlet } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import { filter } from "rxjs/operators";
import { Sidebar } from "../sidebar/sidebar.component";
import { BarraPieApp } from "../barra-pie-app/barra-pie-app";
import { CampanaNotificaciones } from "../../shared/campana-notificaciones/campana-notificaciones";
import { ToastNotificaciones } from "../../shared/toast-notificaciones/toast-notificaciones";
import { ThemeService } from "../../../services/theme.service";

@Component({
  selector: "app-app-layout",
  imports: [RouterOutlet, RouterLink, Sidebar, BarraPieApp, CampanaNotificaciones, ToastNotificaciones, TranslateModule],
  templateUrl: "./app-layout.html",
  styleUrl: "./app-layout.scss"
})
export class AppLayout {

  readonly themeService = inject(ThemeService);

  sidebarAbierta = signal(false);

  constructor(private router: Router) {
    const componente = this;
    this.router.events
      .pipe(filter(function(evento) { return evento instanceof NavigationEnd; }))
      .subscribe(function() { componente.cerrarSidebar(); });
  }

  alternarSidebar(): void {
    this.sidebarAbierta.update(function(v) { return !v; });
  }

  cerrarSidebar(): void {
    this.sidebarAbierta.set(false);
  }
}
