import { Component, computed, Signal, AfterViewInit, OnDestroy, ViewChild, ElementRef } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import { AuthService } from "../../services/auth.service";
import { UsuarioService } from "../../services/usuario.service";
import { EscenaRedServidores } from "../home/escena-red-servidores";

@Component({
  selector: "app-confirmar-free",
  imports: [RouterLink, TranslateModule],
  templateUrl: "./confirmar-free.html",
  styleUrl: "./confirmar-free.scss"
})
export class ConfirmarFree implements AfterViewInit, OnDestroy {
  @ViewChild("lienzoFondo") lienzoFondo!: ElementRef<HTMLElement>;

  estaLogueado: Signal<boolean>;
  planActual: Signal<string>;
  esBajada: Signal<boolean>;

  private escenaDeFondo: EscenaRedServidores | null = null;

  constructor(
    private router: Router,
    private authService: AuthService,
    private usuarioService: UsuarioService
  ) {
    const componente = this;

    this.estaLogueado = computed(function () {
      return componente.authService.estaLogueado();
    });

    this.planActual = computed(function () {
      return componente.usuarioService.plan() || "";
    });

    this.esBajada = computed(function () {
      const plan = componente.planActual();
      return componente.estaLogueado() && (plan === "pro" || plan === "business");
    });
  }

  ngAfterViewInit(): void {
    this.escenaDeFondo = new EscenaRedServidores(this.lienzoFondo.nativeElement);
    this.escenaDeFondo.iniciar();

    const raizDelDocumento = document.documentElement;
    const estaEnTemaClaro = raizDelDocumento.classList.contains("tema-claro");
    this.escenaDeFondo.establecerTema(estaEnTemaClaro);
  }

  ngOnDestroy(): void {
    if (this.escenaDeFondo !== null) {
      this.escenaDeFondo.destruir();
      this.escenaDeFondo = null;
    }
  }

  confirmar(): void {
    if (!this.estaLogueado()) {
      this.router.navigate(["/register"]);
      return;
    }
    this.router.navigate(["/app/dashboard"]);
  }

  cancelar(): void {
    this.router.navigate(["/"]);
  }
}
