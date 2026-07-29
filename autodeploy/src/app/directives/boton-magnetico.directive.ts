import { Directive, ElementRef, OnDestroy, OnInit } from "@angular/core";

@Directive({
  selector: "[botonMagnetico]",
  standalone: true
})
export class BotonMagneticoDirective implements OnInit, OnDestroy {
  private estaActivado = false;
  private funcionMovimientoRaton!: EventListener;
  private funcionSalidaRaton!: EventListener;

  constructor(private elementoRef: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    const consultaHover = window.matchMedia("(hover: hover) and (pointer: fine)");
    const consultaMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");

    const esDispositivoConPuntero = consultaHover.matches;
    const prefiereReducirMovimiento = consultaMovimiento.matches;

    if (!esDispositivoConPuntero || prefiereReducirMovimiento) {
      return;
    }

    this.estaActivado = true;
    this.inicializarEfectoMagnetico();
  }

  private inicializarEfectoMagnetico(): void {
    const elemento = this.elementoRef.nativeElement;

    this.funcionMovimientoRaton = this.manejarMovimientoRaton.bind(this);
    this.funcionSalidaRaton = this.manejarSalidaRaton.bind(this);

    elemento.addEventListener("mousemove", this.funcionMovimientoRaton);
    elemento.addEventListener("mouseleave", this.funcionSalidaRaton);
  }

  private manejarMovimientoRaton(evento: Event): void {
    const eventoRaton = evento as MouseEvent;
    const elemento = this.elementoRef.nativeElement;
    const rectanguloElemento = elemento.getBoundingClientRect();

    const centroPosicionX = rectanguloElemento.left + rectanguloElemento.width / 2;
    const centroPosicionY = rectanguloElemento.top + rectanguloElemento.height / 2;

    const distanciaDesdeCentroX = eventoRaton.clientX - centroPosicionX;
    const distanciaDesdeCentroY = eventoRaton.clientY - centroPosicionY;

    const factorDesplazamientoMagnetico = 0.3;

    const desplazamientoFinalX = distanciaDesdeCentroX * factorDesplazamientoMagnetico;
    const desplazamientoFinalY = distanciaDesdeCentroY * factorDesplazamientoMagnetico;

    elemento.style.transition = "none";
    elemento.style.transform = "translate(" + desplazamientoFinalX + "px, " + desplazamientoFinalY + "px)";
  }

  private manejarSalidaRaton(_evento: Event): void {
    const elemento = this.elementoRef.nativeElement;
    elemento.style.transition = "transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    elemento.style.transform = "translate(0px, 0px)";
  }

  ngOnDestroy(): void {
    if (!this.estaActivado) {
      return;
    }

    const elemento = this.elementoRef.nativeElement;
    elemento.removeEventListener("mousemove", this.funcionMovimientoRaton);
    elemento.removeEventListener("mouseleave", this.funcionSalidaRaton);

    elemento.style.transition = "";
    elemento.style.transform = "";
  }
}
