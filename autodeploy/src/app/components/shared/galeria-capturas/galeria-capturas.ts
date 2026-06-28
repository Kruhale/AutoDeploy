import { Component, Input } from "@angular/core";

/**
 * Una captura de pantalla del producto destinada a la galería accesible.
 *
 * Cada entrada genera un <figure> con <picture> y <figcaption>. El campo
 * `alt` debe describir la información que aporta la imagen (no su
 * apariencia), porque es lo que leerán los usuarios de lectores de
 * pantalla. El `titulo` corto va en el caption visible para el resto de
 * usuarios.
 */
export interface Captura {
  /** Ruta base del WebP de desktop (1200px). */
  src: string;
  /** Ruta de la variante mobile (800px). Opcional. */
  srcMovil?: string;
  /** Fallback en JPG/PNG por si el navegador no soporta WebP. Opcional. */
  fallback?: string;
  /** Descripción significativa de lo que muestra la imagen. */
  alt: string;
  /** Texto corto del caption visible bajo la imagen. */
  titulo: string;
  /** Ancho intrínseco del archivo desktop (para evitar layout shift). */
  ancho: number;
  /** Alto intrínseco del archivo desktop. */
  alto: number;
}

@Component({
  selector: "app-galeria-capturas",
  templateUrl: "./galeria-capturas.html",
  styleUrl: "./galeria-capturas.scss",
})
export class GaleriaCapturas {
  /** Conjunto de capturas a renderizar. Pasarlo desde la página padre. */
  @Input() capturas: Captura[] = [];

  /**
   * Texto accesible que describe el conjunto. Va al `aria-labelledby` del
   * <section> contenedor. Si la página padre ya provee un encabezado
   * adyacente, puede ignorar este input.
   */
  @Input() ariaTitulo: string = "Galería de capturas de AutoDeploy";
}
