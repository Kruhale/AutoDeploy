import { DOCUMENT } from "@angular/common";
import { Injectable, effect, inject, signal } from "@angular/core";

type Tema = "oscuro" | "claro";

const CLAVE_ALMACEN = "tema";
const CLASE_TEMA_CLARO = "tema-claro";

@Injectable({ providedIn: "root" })
export class ThemeService {
  private documento = inject(DOCUMENT);

  // true si el usuario eligió el tema a mano, false si seguimos al sistema
  private eleccionManual = signal<boolean>(this.haGuardado());

  temaActual = signal<Tema>(this.temaInicial());

  constructor() {
    // Aplica el tema y solo lo guarda si lo cambio el usuario a mano
    effect(() => {
      const tema = this.temaActual();
      this.documento.documentElement.classList.toggle(CLASE_TEMA_CLARO, tema === "claro");

      if (this.eleccionManual()) {
        try {
          this.almacen()?.setItem(CLAVE_ALMACEN, tema);
        } catch {
          // Si el localStorage esta bloqueado (modo incognito) el tema solo dura la sesion
        }
      }
    });

    this.escucharSistema();
  }

  alternarTema(): void {
    this.eleccionManual.set(true);
    this.temaActual.update(t => (t === "oscuro" ? "claro" : "oscuro"));
  }

  private temaInicial(): Tema {
    const guardado = this.almacen()?.getItem(CLAVE_ALMACEN);
    if (guardado === "oscuro" || guardado === "claro") {
      return guardado;
    }
    return this.preferenciaDelSistema();
  }

  private haGuardado(): boolean {
    const guardado = this.almacen()?.getItem(CLAVE_ALMACEN);
    return guardado === "oscuro" || guardado === "claro";
  }

  private preferenciaDelSistema(): Tema {
    const ventana = this.documento.defaultView;
    if (!ventana?.matchMedia) {
      return "oscuro";
    }
    return ventana.matchMedia("(prefers-color-scheme: light)").matches ? "claro" : "oscuro";
  }

  // Escucha si el usuario cambia el tema en el sistema y lo aplica si no ha elegido manualmente
  private escucharSistema(): void {
    const ventana = this.documento.defaultView;
    if (!ventana?.matchMedia) {
      return;
    }
    const consulta = ventana.matchMedia("(prefers-color-scheme: light)");
    consulta.addEventListener("change", evento => {
      if (this.eleccionManual()) {
        return;
      }
      this.temaActual.set(evento.matches ? "claro" : "oscuro");
    });
  }

  private almacen(): Storage | null {
    try {
      return this.documento.defaultView?.localStorage ?? null;
    } catch {
      return null;
    }
  }
}
