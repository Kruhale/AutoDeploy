import { Directive, ElementRef, Input, OnDestroy, OnInit } from "@angular/core";

// Cuenta desde 0 hasta el valor final cuando el elemento entra en el viewport.
// Se usa en los numeros grandes de la seccion de estadisticas de la home.
@Directive({
  selector: "[contadorAnimado]",
  standalone: true
})
export class ContadorAnimadoDirective implements OnInit, OnDestroy {
  @Input("contadorAnimado") valorFinal = 0;
  @Input() decimales = 0;
  @Input() sufijo = "";
  @Input() prefijo = "";

  private observador!: IntersectionObserver;
  private idAnimacion = 0;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    const elemento = this.el.nativeElement;
    const directiva = this;

    this.observador = new IntersectionObserver(
      function (entradas) {
        const primeraEntrada = entradas[0];
        if (primeraEntrada.isIntersecting) {
          directiva.observador.disconnect();
          directiva.animarConteo();
        }
      },
      { threshold: 0.4 }
    );

    this.observador.observe(elemento);
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
      elemento.textContent = directiva.formatear(directiva.valorFinal);
      return;
    }

    const duracionMs = 1600;
    let tiempoInicio = 0;

    function pasoDelConteo(marcaTiempo: number): void {
      if (tiempoInicio === 0) {
        tiempoInicio = marcaTiempo;
      }
      const transcurrido = marcaTiempo - tiempoInicio;
      const progreso = Math.min(transcurrido / duracionMs, 1);
      const progresoSuavizado = 1 - Math.pow(1 - progreso, 3);
      const valorActual = directiva.valorFinal * progresoSuavizado;
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
