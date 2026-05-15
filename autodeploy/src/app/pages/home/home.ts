import { Component, computed, Signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { ScrollRevealDirective } from "../../directives/scroll-reveal.directive";
import { AuthService } from "../../services/auth.service";
import { UsuarioService } from "../../services/usuario.service";

@Component({
  selector: "app-home",
  imports: [RouterLink, ScrollRevealDirective],
  templateUrl: "./home.html",
  styleUrl: "./home.scss",
})
export class Home {
  rutaEmpezar: Signal<string>;
  planActivo: Signal<string>;

  constructor(
    private authService: AuthService,
    private usuarioService: UsuarioService
  ) {
    const componente = this;

    this.planActivo = computed(function() {
      if (!componente.authService.estaLogueado()) {
        return "";
      }
      return componente.usuarioService.plan() || "";
    });

    this.rutaEmpezar = computed(function() {
      return "/confirmar-free";
    });
  }
}
