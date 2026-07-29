import { Component, computed, signal, Signal, AfterViewInit, OnDestroy, ViewChild, ElementRef } from "@angular/core";
import { RouterLink } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ContadorAnimadoDirective } from "../../directives/contador-animado.directive";
import { BotonMagneticoDirective } from "../../directives/boton-magnetico.directive";
import { AuthService } from "../../services/auth.service";
import { UsuarioService } from "../../services/usuario.service";
import { PanelEnVivo } from "./panel-en-vivo";

// A donde vuela cada ficha al ordenarse el caos: dos columnas limpias
// flanqueando la terminal, como estanterias del panel (fracciones del hero).
const FORMACION_DEL_PANEL = [
  { ficha: "compose", x: 0.24, y: 0.34 },
  { ficha: "metricas", x: 0.24, y: 0.48 },
  { ficha: "nginx", x: 0.24, y: 0.62 },
  { ficha: "certificado", x: 0.24, y: 0.76 },
  { ficha: "dominio", x: 0.76, y: 0.34 },
  { ficha: "ssh", x: 0.76, y: 0.48 },
  { ficha: "backup", x: 0.76, y: 0.62 },
  { ficha: "log", x: 0.76, y: 0.76 }
];

@Component({
  selector: "app-home",
  imports: [RouterLink, ContadorAnimadoDirective, BotonMagneticoDirective, TranslateModule, PanelEnVivo],
  templateUrl: "./home.html",
  styleUrl: "./home.scss"
})
export class Home implements AfterViewInit, OnDestroy {
  @ViewChild("capituloPortada") capituloPortada!: ElementRef<HTMLElement>;
  @ViewChild("tituloPortada") tituloPortada!: ElementRef<HTMLElement>;
  @ViewChild("textoManifiesto") textoManifiesto!: ElementRef<HTMLElement>;

  rutaEmpezar: Signal<string>;
  planActivo: Signal<string>;

  private scrollSuave: Lenis | null = null;
  private idAnimacionScroll = 0;
  private movimientoScrollActivo = false;
  private gestorDeMedios: ReturnType<typeof gsap.matchMedia> | null = null;

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
    if (this.gestorDeMedios !== null) {
      // revert() ejecuta la limpieza del capitulo (quita el mousemove del paralaje).
      this.gestorDeMedios.revert();
      this.gestorDeMedios = null;
    }
    if (this.movimientoScrollActivo) {
      const disparadores = ScrollTrigger.getAll();
      disparadores.forEach(function (disparador) {
        // kill() del trigger no mata su tween: sin esto, los reveals que nunca
        // llegaron a reproducirse retendrian sus elementos en memoria.
        const animacionDelDisparador = disparador.animation;
        disparador.kill();
        if (animacionDelDisparador) {
          animacionDelDisparador.kill();
        }
      });
      this.movimientoScrollActivo = false;
    }
  }

  // El capitulo cinematografico del hero (patron ponder.ai): la seccion se
  // fija y el scroll intercambia titulares con blur mientras las fichas del
  // caos vuelan a su formacion de panel. Solo en escritorio.
  private crearCapituloDePortada(): void {
    const componente = this;
    const gestorDeMedios = gsap.matchMedia();
    this.gestorDeMedios = gestorDeMedios;

    gestorDeMedios.add("(min-width: 1024px)", function () {
      const seccionDelCapitulo = componente.capituloPortada.nativeElement;
      const tituloUno = componente.tituloPortada.nativeElement;
      const capitulos = seccionDelCapitulo.querySelectorAll(".portada__titulo--capitulo");
      const tituloDos = capitulos[0];
      const tituloTres = capitulos[1];

      const lineaDelCapitulo = gsap.timeline({
        scrollTrigger: {
          trigger: seccionDelCapitulo,
          start: "top top",
          end: "+=180%",
          // Inercia: la animacion persigue al scroll con ~1s de colchon en
          // vez de ir clavada a la rueda (seda, no tiron).
          scrub: 1.2,
          pin: true,
          anticipatePin: 1
        }
      });

      // El panel avanza sutilmente hacia el espectador durante el capitulo.
      const panelDelCapitulo = seccionDelCapitulo.querySelector(".portada__panel");
      lineaDelCapitulo.fromTo(panelDelCapitulo, { scale: 0.965 }, { scale: 1, duration: 1.6, ease: "power1.inOut" }, 0.1);

      // Acto 1 → 2: el titular se va con blur y entra "Del caos, al panel".
      lineaDelCapitulo.to(tituloUno, { opacity: 0, filter: "blur(14px)", y: -36, duration: 0.9 }, 0.1);

      // La descripcion y el CTA se retiran CON el titular: los capitulos 2 y 3
      // (tres lineas) necesitan ese aire y el capitulo respira solo.
      // autoAlpha (visibility) evita que el CTA invisible sea enfocable.
      lineaDelCapitulo.to(".portada__descripcion, .portada__acciones", { autoAlpha: 0, filter: "blur(6px)", y: -24, duration: 0.9 }, 0.1);
      lineaDelCapitulo.to(tituloDos, { opacity: 1, filter: "blur(0px)", duration: 0.9 }, 0.35);

      // Las fichas vuelan del caos a la formacion de panel.
      for (let indice = 0; indice < FORMACION_DEL_PANEL.length; indice++) {
        const destino = FORMACION_DEL_PANEL[indice];
        const ficha = seccionDelCapitulo.querySelector('[data-ficha="' + destino.ficha + '"]') as HTMLElement | null;
        if (ficha === null) {
          continue;
        }

        // Delta hasta el destino, recalculado en cada refresh (responsive).
        function calcularDeltaX(): number {
          const cajaSeccion = seccionDelCapitulo.getBoundingClientRect();
          const cajaFicha = ficha!.getBoundingClientRect();
          const centroActualX = cajaFicha.left + cajaFicha.width / 2 - cajaSeccion.left;
          const equisActual = gsap.getProperty(ficha, "x") as number;
          return destino.x * cajaSeccion.width - (centroActualX - equisActual);
        }

        function calcularDeltaY(): number {
          const cajaSeccion = seccionDelCapitulo.getBoundingClientRect();
          const cajaFicha = ficha!.getBoundingClientRect();
          const centroActualY = cajaFicha.top + cajaFicha.height / 2 - cajaSeccion.top;
          const yeActual = gsap.getProperty(ficha, "y") as number;
          return destino.y * cajaSeccion.height - (centroActualY - yeActual);
        }

        lineaDelCapitulo.to(
          ficha,
          {
            x: calcularDeltaX,
            y: calcularDeltaY,
            z: 0,
            rotate: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: 1.1,
            ease: "power2.inOut"
          },
          0.25 + indice * 0.05
        );
      }

      // Acto 2 → 3: "Despliega en minutos" cierra el capitulo.
      lineaDelCapitulo.to(tituloDos, { opacity: 0, filter: "blur(14px)", y: -36, duration: 0.9 }, 1.7);
      lineaDelCapitulo.to(tituloTres, { opacity: 1, filter: "blur(0px)", duration: 0.9 }, 1.95);

      // Parallax 3D: el raton rota el campo de fichas (las cercanas se
      // desplazan mas que las lejanas gracias a sus translateZ reales) y
      // la terminal se inclina un par de grados. quickTo = suave y barato.
      const constelacion = seccionDelCapitulo.querySelector(".portada__constelacion");
      const panelCentral = seccionDelCapitulo.querySelector(".portada__panel");
      const rotarCampoX = gsap.quickTo(constelacion, "rotationX", { duration: 0.9, ease: "power2.out" });
      const rotarCampoY = gsap.quickTo(constelacion, "rotationY", { duration: 0.9, ease: "power2.out" });
      const inclinarTerminalX = gsap.quickTo(panelCentral, "rotationX", { duration: 1.1, ease: "power2.out" });
      const inclinarTerminalY = gsap.quickTo(panelCentral, "rotationY", { duration: 1.1, ease: "power2.out" });

      function manejarParalajeRaton(evento: MouseEvent): void {
        const equisNormalizada = (evento.clientX / window.innerWidth) * 2 - 1;
        const yeNormalizada = (evento.clientY / window.innerHeight) * 2 - 1;
        rotarCampoY(equisNormalizada * 4);
        rotarCampoX(yeNormalizada * -3);
        inclinarTerminalY(equisNormalizada * 2.5);
        inclinarTerminalX(yeNormalizada * -2);
      }

      window.addEventListener("mousemove", manejarParalajeRaton);

      // gsap.matchMedia ejecuta esta limpieza al salir del contexto.
      return function limpiarParalaje(): void {
        window.removeEventListener("mousemove", manejarParalajeRaton);
      };
    });
  }

  private iniciarScrollSuave(): void {
    const prefiereMenosMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefiereMenosMovimiento) {
      return;
    }

    // 1.5: el scroll pesa como una pagina de producto, sin llegar a flotar.
    this.scrollSuave = new Lenis({ duration: 1.5, smoothWheel: true });

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

    this.crearCapituloDePortada();
    this.ocultarHeaderAlBajar();
    this.revelarTituloDePortada();
    this.revelarManifiestoPorPalabras();
    this.revelarBloquesAlScroll();
    this.dibujarReglasEditoriales();
    this.revelarRotulosDeCapitulo();
    this.encenderPasoActivo();
    this.crearHudDeCapitulos();

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

    gsap.from(".portada__descripcion, .portada__acciones", {
      opacity: 0,
      y: 24,
      duration: 1,
      ease: "power3.out",
      stagger: 0.12,
      delay: 0.75
    });

    // El panel llega el ultimo, como el producto posandose en el escenario.
    gsap.from(".portada__panel", {
      opacity: 0,
      y: 36,
      filter: "blur(10px)",
      duration: 1.2,
      ease: "power3.out",
      delay: 0.95,
      clearProps: "filter"
    });
  }

  // Divide el manifiesto en palabras y las enciende una a una atadas al scroll
  // (scrub): el parrafo se "lee solo" mientras el usuario baja.
  private revelarManifiestoPorPalabras(): void {
    const parrafoDelManifiesto = this.textoManifiesto.nativeElement;
    const textoCompleto = parrafoDelManifiesto.textContent || "";
    const palabrasDelTexto = textoCompleto.trim().split(/\s+/);

    parrafoDelManifiesto.textContent = "";

    // Los terminos tecnicos son invariantes en los 5 idiomas: prenden en
    // ambar al encenderse, como la voz del titular dentro del parrafo.
    const patronDePalabraClave = /^(AutoDeploy|VPS|SSH|HTTPS|DevOps)[.,;:]?$/;

    palabrasDelTexto.forEach(function (palabra) {
      const nodoDePalabra = document.createElement("span");
      nodoDePalabra.className = "manifiesto__palabra";
      if (patronDePalabraClave.test(palabra)) {
        nodoDePalabra.classList.add("manifiesto__palabra--clave");
      }
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
      // Los bloques lado a lado (cifras, planes) comparten linea de disparo:
      // entran en cascada suave en vez de los tres de golpe.
      const posicionEntreHermanos = Array.prototype.indexOf.call(bloque.parentElement!.children, bloque);
      const esBloqueEnFila = bloque.matches(".cifras__item, .planes__plan");
      const retardoEnCascada = esBloqueEnFila ? posicionEntreHermanos * 0.12 : 0;

      const revelado = gsap.from(bloque, {
        opacity: 0,
        y: 28,
        // El desenfoque firma del hero: cada seccion entra "enfocandose",
        // despacio y sin empujar (mas recorrido seria golpe, no seda).
        filter: "blur(6px)",
        duration: 1.2,
        delay: retardoEnCascada,
        ease: "power2.out",
        // Sin residuo inline: el filter vuelve a "none" al terminar.
        clearProps: "filter",
        scrollTrigger: {
          trigger: bloque,
          start: "top 88%"
        }
      });

      // Si el teclado entra en un bloque aun oculto, el reveal se completa al
      // instante: el foco nunca cae sobre un enlace invisible (WCAG 2.4.7).
      bloque.addEventListener("focusin", function () {
        revelado.progress(1);
      });
    });
  }

  // Las reglas editoriales se dibujan de izquierda a derecha al entrar cada
  // fila: el periodico se imprime mientras se lee. GSAP anima la variable
  // --traza (0 a 1) que el ::after de cada fila usa como scaleX.
  private dibujarReglasEditoriales(): void {
    const filasConRegla = gsap.utils.toArray<HTMLElement>(".proceso__paso, .capacidades__fila, .proceso__pasos, .capacidades__lista, .cifras__lista, .planes__columnas");

    filasConRegla.forEach(function (fila) {
      gsap.from(fila, {
        "--traza": 0,
        duration: 1.3,
        delay: 0.15,
        ease: "power2.inOut",
        scrollTrigger: {
          trigger: fila,
          start: "top 88%"
        }
      });
    });
  }

  // Los rotulos sueltos de capitulo derivan atados al scroll: se encienden
  // segun el lector se acerca, en vez de saltar con un reveal fijo.
  private revelarRotulosDeCapitulo(): void {
    const rotulosSueltos = gsap.utils.toArray<HTMLElement>(".manifiesto__eyebrow, .capacidades__eyebrow, .cifras__eyebrow");

    rotulosSueltos.forEach(function (rotulo) {
      gsap.from(rotulo, {
        opacity: 0,
        y: 18,
        ease: "none",
        scrollTrigger: {
          trigger: rotulo,
          start: "top 94%",
          end: "top 72%",
          scrub: true
        }
      });
    });
  }

  // El HUD de capitulos acompana al lector tras el hero: marca la seccion
  // numerada bajo el viewport y se retira antes del cierre.
  private crearHudDeCapitulos(): void {
    const hud = document.getElementById("hud-capitulos");
    const numeroDelHud = document.getElementById("hud-numero");
    if (hud === null || numeroDelHud === null) {
      return;
    }

    const capitulosNumerados = [
      { id: "manifiesto", numero: "01" },
      { id: "como-funciona", numero: "02" },
      { id: "features", numero: "03" },
      { id: "cifras", numero: "04" },
      { id: "pricing", numero: "05" }
    ];

    capitulosNumerados.forEach(function (capitulo) {
      const seccionDelCapitulo = document.getElementById(capitulo.id);
      if (seccionDelCapitulo === null) {
        return;
      }
      ScrollTrigger.create({
        trigger: seccionDelCapitulo,
        start: "top 55%",
        end: "bottom 45%",
        onToggle: function (disparador) {
          if (!disparador.isActive) {
            return;
          }
          numeroDelHud.textContent = capitulo.numero;
          // Micro-flick al cambiar de capitulo: el numero "cae" en su sitio.
          gsap.fromTo(numeroDelHud, { y: 5, opacity: 0.3 }, { y: 0, opacity: 1, duration: 0.35, ease: "power2.out" });
        }
      });
    });

    // Solo vive entre el manifiesto y el final de los planes.
    ScrollTrigger.create({
      trigger: "#manifiesto",
      start: "top 70%",
      endTrigger: "#pricing",
      end: "bottom 30%",
      toggleClass: { targets: hud, className: "hud-capitulos--visible" }
    });
  }

  // El numero del paso bajo el lector se enciende en ambar: el proceso
  // "sabe" por donde vas, como los capitulos de una keynote.
  private encenderPasoActivo(): void {
    const pasosDelProceso = gsap.utils.toArray<HTMLElement>(".proceso__paso");

    pasosDelProceso.forEach(function (paso) {
      // Banda de un solo punto (el centro): nunca hay dos pasos encendidos.
      ScrollTrigger.create({
        trigger: paso,
        start: "top 50%",
        end: "bottom 50%",
        toggleClass: "proceso__paso--activo"
      });
    });
  }
}
