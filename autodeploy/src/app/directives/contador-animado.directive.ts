import { Directive, ElementRef, Input, OnChanges, OnDestroy, OnInit } from "@angular/core";

// Cuenta desde 0 hasta el valor final cuando el elemento entra en el viewport.
// Reacciona a cambios del valor (los datos del panel llegan async) volviendo
// a contar desde el valor mostrado hasta el nuevo.
@Directive({
  selector: "[contadorAnimado]",
  standalone: true
})
export class ContadorAnimadoDirective implements OnInit, OnChanges, OnDestroy {
  @Input("contadorAnimado") valorFinal = 0;
  @Input() decimales = 0;
  @Input() sufijo = "";
  @Input() prefijo = "";

  private observador!: IntersectionObserver;
  private idAnimacion = 0;
  private yaVisible = false;
  private valorMostrado = 0;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    const elemento = this.el.nativeElement;
    const directiva = this;

    this.observador = new IntersectionObserver(
      function (entradas) {
        const primeraEntrada = entradas[0];
        if (primeraEntrada.isIntersecting) {
          directiva.observador.disconnect();
          directiva.yaVisible = true;
          directiva.animarConteo();
        }
      },
      { threshold: 0.4 }
    );

    this.observador.observe(elemento);
  }

  ngOnChanges(): void {
    // Si el numero cambia despues de haberse revelado (carga async), lo
    // re-contamos desde lo que ya se veia hasta el nuevo valor.
    if (this.yaVisible) {
      this.animarConteo();
    }
  }

  ngOnDestroy(): void {
    if (this.observador) {
      this.observador.disconnect();
    }
    cancelAnimationFrame(this.idAnimacion);
  }

  private animarConteo(): void {
    const elemento = this.el.nativeElement;
    const directiva = this;

    const prefiereMenosMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefiereMenosMovimiento) {
      directiva.valorMostrado = directiva.valorFinal;
      elemento.textContent = directiva.formatear(directiva.valorFinal);
      return;
    }

    cancelAnimationFrame(this.idAnimacion);
    const valorInicial = directiva.valorMostrado;
    const distancia = directiva.valorFinal - valorInicial;
    const duracionMs = 1400;
    let tiempoInicio = 0;

    function pasoDelConteo(marcaTiempo: number): void {
      if (tiempoInicio === 0) {
        tiempoInicio = marcaTiempo;
      }
      const transcurrido = marcaTiempo - tiempoInicio;
      const progreso = Math.min(transcurrido / duracionMs, 1);
      const progresoSuavizado = 1 - Math.pow(1 - progreso, 3);
      const valorActual = valorInicial + distancia * progresoSuavizado;
      directiva.valorMostrado = valorActual;
      elemento.textContent = directiva.formatear(valorActual);

      if (progreso < 1) {
        directiva.idAnimacion = requestAnimationFrame(pasoDelConteo);
      }
    }

    this.idAnimacion = requestAnimationFrame(pasoDelConteo);
  }

  private formatear(valor: number): string {
    const valorRedondeado = valor.toFixed(this.decimales);
    return this.prefijo + valorRedondeado + this.sufijo;
  }
}
