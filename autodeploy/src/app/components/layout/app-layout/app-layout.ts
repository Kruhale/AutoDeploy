import { Component, signal } from "@angular/core";
import { RouterLink, RouterOutlet } from "@angular/router";
import { Sidebar } from "../sidebar/sidebar.component";
import { BarraPieApp } from "../barra-pie-app/barra-pie-app";
import { CampanaNotificaciones } from "../../shared/campana-notificaciones/campana-notificaciones";
import { ToastNotificaciones } from "../../shared/toast-notificaciones/toast-notificaciones";

@Component({
  selector: "app-app-layout",
  imports: [RouterOutlet, RouterLink, Sidebar, BarraPieApp, CampanaNotificaciones, ToastNotificaciones],
  templateUrl: "./app-layout.html",
  styleUrl: "./app-layout.scss"
})
export class AppLayout {

  sidebarAbierta = signal(false);

  alternarSidebar(): void {
    this.sidebarAbierta.update(function(v) { return !v; });
  }

  cerrarSidebar(): void {
    this.sidebarAbierta.set(false);
  }
}
