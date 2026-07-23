import { Component, computed, Signal, AfterViewInit, OnDestroy, ViewChild, ElementRef } from "@angular/core";
import { RouterLink } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ContadorAnimadoDirective } from "../../directives/contador-animado.directive";
import { BotonMagneticoDirective } from "../../directives/boton-magnetico.directive";
import { AuthService } from "../../services/auth.service";
import { UsuarioService } from "../../services/usuario.service";
import { TerminalDespliegue } from "./terminal-despliegue";

@Component({
  selector: "app-home",
  imports: [RouterLink, ContadorAnimadoDirective, BotonMagneticoDirective, TranslateModule, TerminalDespliegue],
  templateUrl: "./home.html",
  styleUrl: "./home.scss"
})
export class Home implements AfterViewInit, OnDestroy {
  @ViewChild("tituloPortada") tituloPortada!: ElementRef<HTMLElement>;
  @ViewChild("textoManifiesto") textoManifiesto!: ElementRef<HTMLElement>;

  rutaEmpezar: Signal<string>;
  planActivo: Signal<string>;

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
    this.iniciarScrollSuave();
    this.iniciarMovimientoScroll();
  }

  ngOnDestroy(): void {
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

  private iniciarScrollSuave(): void {
    const prefiereMenosMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefiereMenosMovimiento) {
      return;
    }

    this.scrollSuave = new Lenis({ duration: 1.15, smoothWheel: true });

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
    if (prefiereMenosMovimiento) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    this.movimientoScrollActivo = true;

    if (this.scrollSuave !== null) {
      this.scrollSuave.on("scroll", function () {
        ScrollTrigger.update();
      });
    }

    this.ocultarHeaderAlBajar();
    this.revelarTituloDePortada();
    this.revelarManifiestoPorPalabras();
    this.revelarBloquesAlScroll();

    ScrollTrigger.refresh();
  }

  // El header se esconde al bajar y reaparece al subir: los titulares
  // monumentales nunca chocan con el, y la pagina gana pantalla completa.
  private ocultarHeaderAlBajar(): void {
    const barraDeCabecera = document.querySelector(".cabecera");
    if (barraDeCabecera === null) {
      return;
    }

    ScrollTrigger.create({
      start: "top top",
      end: "max",
      onUpdate: function (disparador) {
        const estaBajando = disparador.direction === 1;
        const haPasadoElHero = disparador.scroll() > 400;
        barraDeCabecera.classList.toggle("cabecera--oculta", estaBajando && haPasadoElHero);
      }
    });
  }

  private revelarTituloDePortada(): void {
    const lineasDelTitulo = this.tituloPortada.nativeElement.querySelectorAll(".portada__titulo__texto");

    gsap.from(lineasDelTitulo, {
      yPercent: 110,
      duration: 1.2,
      ease: "power4.out",
      stagger: 0.14,
      delay: 0.25
    });

    gsap.from(".portada__sello, .portada__descripcion, .portada__acciones", {
      opacity: 0,
      y: 24,
      duration: 1,
      ease: "power3.out",
      stagger: 0.12,
      delay: 0.75
    });
  }

  // Divide el manifiesto en palabras y las enciende una a una atadas al scroll
  // (scrub): el parrafo se "lee solo" mientras el usuario baja.
  private revelarManifiestoPorPalabras(): void {
    const parrafoDelManifiesto = this.textoManifiesto.nativeElement;
    const textoCompleto = parrafoDelManifiesto.textContent || "";
    const palabrasDelTexto = textoCompleto.trim().split(/\s+/);

    parrafoDelManifiesto.textContent = "";

    palabrasDelTexto.forEach(function (palabra) {
      const nodoDePalabra = document.createElement("span");
      nodoDePalabra.className = "manifiesto__palabra";
      nodoDePalabra.textContent = palabra + " ";
      parrafoDelManifiesto.appendChild(nodoDePalabra);
    });

    gsap.to(".manifiesto__palabra", {
      opacity: 1,
      stagger: 0.06,
      ease: "none",
      scrollTrigger: {
        trigger: ".manifiesto",
        start: "top 75%",
        end: "bottom 55%",
        scrub: true
      }
    });
  }

  private revelarBloquesAlScroll(): void {
    const bloquesConReveal = gsap.utils.toArray<HTMLElement>(
      ".proceso__paso, .capacidades__fila, .cifras__item, .planes__plan, .cierre__titulo, .cierre__descripcion, .cierre__cta, .proceso__cabecera, .planes__cabecera"
    );

    bloquesConReveal.forEach(function (bloque) {
      gsap.from(bloque, {
        opacity: 0,
        y: 44,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: {
          trigger: bloque,
          start: "top 88%"
        }
      });
    });
  }
}
