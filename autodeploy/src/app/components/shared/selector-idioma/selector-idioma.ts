import { Component, Input, HostListener, ElementRef, inject } from "@angular/core";
import { TranslateModule } from "@ngx-translate/core";
import { IdiomaService } from "../../../services/idioma.service";

@Component({
  selector: "app-selector-idioma",
  standalone: true,
  imports: [TranslateModule],
  templateUrl: "./selector-idioma.html",
  styleUrl: "./selector-idioma.scss"
})
export class SelectorIdioma {

  @Input() modo: "desplegable" | "expandido" = "desplegable";

  readonly idiomaService = inject(IdiomaService);
  private elemento = inject(ElementRef<HTMLElement>);

  desplegableAbierto = false;

  abrirCerrarDesplegable(): void {
    this.desplegableAbierto = !this.desplegableAbierto;
  }

  seleccionarIdioma(codigo: string): void {
    this.idiomaService.cambiarIdioma(codigo);
    this.desplegableAbierto = false;
  }

  idiomaActivoActual() {
    const codigoActual = this.idiomaService.idiomaActual();
    return this.idiomaService.obtenerIdiomaSoportado(codigoActual);
  }

  @HostListener("document:click", ["$event"])
  cerrarSiClicFuera(evento: MouseEvent): void {
    if (this.modo !== "desplegable" || !this.desplegableAbierto) {
      return;
    }
    const dentro = this.elemento.nativeElement.contains(evento.target as Node);
    if (!dentro) {
      this.desplegableAbierto = false;
    }
  }
}
