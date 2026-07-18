import { AfterViewInit, Component, OnDestroy, input, output } from "@angular/core";
import { TranslateModule } from "@ngx-translate/core";

@Component({
  selector: "app-dialogo-confirmacion",
  imports: [TranslateModule],
  templateUrl: "./dialogo-confirmacion.html",
  styleUrl: "./dialogo-confirmacion.scss"
})
export class DialogoConfirmacion implements AfterViewInit, OnDestroy {
  titulo = input.required<string>();
  mensaje = input.required<string>();
  textoConfirmar = input.required<string>();
  peligro = input<boolean>(false);
  confirmar = output<void>();
  cancelar = output<void>();

  elementoConFocoPrevio: HTMLElement | null = null;

  ngAfterViewInit(): void {
    // Guardamos el foco de origen para devolverlo al cerrar (WCAG 2.4.3)
    this.elementoConFocoPrevio = document.activeElement as HTMLElement | null;
    const botonCancelar = document.getElementById("dialogo-boton-cancelar");
    botonCancelar?.focus();
  }

  ngOnDestroy(): void {
    this.elementoConFocoPrevio?.focus();
  }

  emitirCancelar(): void {
    this.cancelar.emit();
  }

  emitirConfirmar(): void {
    this.confirmar.emit();
  }

  manejarTabulacion(evento: Event): void {
    // Trampa de foco minima: el Tab circula entre los dos botones del dialogo
    const eventoTeclado = evento as KeyboardEvent;
    const botonCancelar = document.getElementById("dialogo-boton-cancelar");
    const botonConfirmar = document.getElementById("dialogo-boton-confirmar");
    if (!botonCancelar || !botonConfirmar) {
      return;
    }
    const elementoActivo = document.activeElement;
    if (eventoTeclado.shiftKey && elementoActivo === botonCancelar) {
      eventoTeclado.preventDefault();
      botonConfirmar.focus();
      return;
    }
    if (!eventoTeclado.shiftKey && elementoActivo === botonConfirmar) {
      eventoTeclado.preventDefault();
      botonCancelar.focus();
    }
  }
}
