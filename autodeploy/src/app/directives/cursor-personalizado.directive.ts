import { Directive, OnDestroy, OnInit } from "@angular/core";

@Directive({
  selector: "[cursorPersonalizado]",
  standalone: true
})
export class CursorPersonalizadoDirective implements OnInit, OnDestroy {
  private elementoAro!: HTMLElement;
  private posicionObjetivoX = 0;
  private posicionObjetivoY = 0;
  private posicionActualX = 0;
  private posicionActualY = 0;
  private idAnimacionFrame = 0;
  private estaActivado = false;
  private funcionMovimientoRaton!: EventListener;
  private funcionAnimacionFrame!: FrameRequestCallback;

  ngOnInit(): void {
    const consultaHover = window.matchMedia("(hover: hover) and (pointer: fine)");
    const consultaMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");

    const esDispositivoConPuntero = consultaHover.matches;
    const prefiereReducirMovimiento = consultaMovimiento.matches;

    if (!esDispositivoConPuntero || prefiereReducirMovimiento) {
      return;
    }

    this.estaActivado = true;
    this.inicializarCursor();
  }

  private inicializarCursor(): void {
    this.elementoAro = document.createElement("span");
    this.elementoAro.classList.add("cursor-personalizado");
    document.body.appendChild(this.elementoAro);
    document.body.classList.add("cursor-personalizado-activo");

    this.funcionMovimientoRaton = this.manejarMovimientoRaton.bind(this);
    this.funcionAnimacionFrame = this.actualizarPosicionAro.bind(this);

    document.addEventListener("mousemove", this.funcionMovimientoRaton);
    this.idAnimacionFrame = requestAnimationFrame(this.funcionAnimacionFrame);
  }

  private manejarMovimientoRaton(evento: Event): void {
    const eventoRaton = evento as MouseEvent;
    this.posicionObjetivoX = eventoRaton.clientX;
    this.posicionObjetivoY = eventoRaton.clientY;

    const elementoBajoRaton = eventoRaton.target as HTMLElement;
    const existeElementoInteractivo = elementoBajoRaton.closest('a, button, [role="button"]');

    if (existeElementoInteractivo) {
      this.elementoAro.classList.add("cursor-personalizado--activo");
    } else {
      this.elementoAro.classList.remove("cursor-personalizado--activo");
    }
  }

  private actualizarPosicionAro(_marca: number): void {
    if (!this.estaActivado) {
      return;
    }

    const factorLerp = 0.12;

    const diferenciaX = this.posicionObjetivoX - this.posicionActualX;
    const diferenciaY = this.posicionObjetivoY - this.posicionActualY;

    this.posicionActualX = this.posicionActualX + diferenciaX * factorLerp;
    this.posicionActualY = this.posicionActualY + diferenciaY * factorLerp;

    this.elementoAro.style.left = this.posicionActualX + "px";
    this.elementoAro.style.top = this.posicionActualY + "px";

    this.idAnimacionFrame = requestAnimationFrame(this.funcionAnimacionFrame);
  }

  ngOnDestroy(): void {
    if (!this.estaActivado) {
      return;
    }

    this.estaActivado = false;
    cancelAnimationFrame(this.idAnimacionFrame);
    document.removeEventListener("mousemove", this.funcionMovimientoRaton);

    if (this.elementoAro.parentNode) {
      this.elementoAro.parentNode.removeChild(this.elementoAro);
    }

    document.body.classList.remove("cursor-personalizado-activo");
  }
}
