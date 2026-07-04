import { Component, computed, Signal, AfterViewInit, OnDestroy, ViewChild, ElementRef } from "@angular/core";
import { RouterLink } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollRevealDirective } from "../../directives/scroll-reveal.directive";
import { ContadorAnimadoDirective } from "../../directives/contador-animado.directive";
import { CursorPersonalizadoDirective } from "../../directives/cursor-personalizado.directive";
import { BotonMagneticoDirective } from "../../directives/boton-magnetico.directive";
import { AuthService } from "../../services/auth.service";
import { UsuarioService } from "../../services/usuario.service";
import { EscenaRedServidores } from "./escena-red-servidores";

@Component({
  selector: "app-home",
  imports: [RouterLink, ScrollRevealDirective, ContadorAnimadoDirective, CursorPersonalizadoDirective, BotonMagneticoDirective, TranslateModule],
  templateUrl: "./home.html",
  styleUrl: "./home.scss"
})
export class Home implements AfterViewInit, OnDestroy {
  @ViewChild("lienzoHero") lienzoHero!: ElementRef<HTMLElement>;
  @ViewChild("terminalHero") terminalHero!: ElementRef<HTMLElement>;

  rutaEmpezar: Signal<string>;
  planActivo: Signal<string>;

  private escenaHero: EscenaRedServidores | null = null;
  private scrollSuave: Lenis | null = null;
  private idAnimacionScroll = 0;
  private movimientoScrollActivo = false;

  constructor(
    private authService: AuthService,
    private usuarioService: UsuarioService
  ) {
    const componente = this;

    this.planActivo = computed(function () {
      if (!componente.authService.estaLogueado()) {
        return "";
      }
      return componente.usuarioService.plan() || "";
    });

    this.rutaEmpezar = computed(function () {
      return "/confirmar-free";
    });
  }

  ngAfterViewInit(): void {
    this.escenaHero = new EscenaRedServidores(this.lienzoHero.nativeElement);
    this.escenaHero.iniciar();
    this.iniciarScrollSuave();
    this.iniciarMovimientoScroll();
  }

  ngOnDestroy(): void {
    if (this.escenaHero !== null) {
      this.escenaHero.destruir();
      this.escenaHero = null;
    }
    if (this.scrollSuave !== null) {
      cancelAnimationFrame(this.idAnimacionScroll);
      this.scrollSuave.destroy();
      this.scrollSuave = null;
    }
    if (this.movimientoScrollActivo) {
      const disparadores = ScrollTrigger.getAll();
      disparadores.forEach(function (disparador) {
        disparador.kill();
      });
      this.movimientoScrollActivo = false;
    }
  }

  reejecutarTerminal(): void {
    if (this.escenaHero !== null) {
      this.escenaHero.resaltar();
    }

    const prefiereMenosMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefiereMenosMovimiento) {
      return;
    }

    const cuerpoTerminal = this.terminalHero.nativeElement;
    const lineasTerminal = cuerpoTerminal.querySelectorAll(".seccion-bienvenida__terminal__linea");

    lineasTerminal.forEach(function (nodo) {
      const linea = nodo as HTMLElement;
      linea.style.animation = "none";
      void linea.offsetWidth;
      linea.style.animation = "";
    });
  }

  private iniciarScrollSuave(): void {
    const prefiereMenosMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefiereMenosMovimiento) {
      return;
    }

    this.scrollSuave = new Lenis({ duration: 1.1, smoothWheel: true });

    const componente = this;

    function avanzarScroll(tiempo: number): void {
      if (componente.scrollSuave !== null) {
        componente.scrollSuave.raf(tiempo);
      }
      componente.idAnimacionScroll = requestAnimationFrame(avanzarScroll);
    }

    this.idAnimacionScroll = requestAnimationFrame(avanzarScroll);
  }

  private iniciarMovimientoScroll(): void {
    const prefiereMenosMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefiereMenosMovimiento || this.scrollSuave === null) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    this.movimientoScrollActivo = true;

    this.scrollSuave.on("scroll", function () {
      ScrollTrigger.update();
    });

    gsap.to(this.lienzoHero.nativeElement, {
      yPercent: 20,
      ease: "none",
      scrollTrigger: {
        trigger: ".seccion-bienvenida",
        start: "top top",
        end: "bottom top",
        scrub: true
      }
    });

    gsap.to(".seccion-bienvenida__brillo", {
      yPercent: 30,
      ease: "none",
      scrollTrigger: {
        trigger: ".seccion-bienvenida",
        start: "top top",
        end: "bottom top",
        scrub: true
      }
    });

    const numerosDelWorkflow = gsap.utils.toArray<HTMLElement>(".workflow__paso__numero");
    numerosDelWorkflow.forEach(function (numero) {
      gsap.from(numero, {
        scale: 1.4,
        ease: "power3.out",
        duration: 0.8,
        scrollTrigger: {
          trigger: numero,
          start: "top 88%"
        }
      });
    });

    ScrollTrigger.refresh();
  }
}
