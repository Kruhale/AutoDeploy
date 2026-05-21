import { DOCUMENT } from "@angular/common";
import { Injectable, effect, inject, signal } from "@angular/core";

type Tema = "oscuro" | "claro";

const CLAVE_ALMACEN = "tema";
const CLASE_TEMA_CLARO = "tema-claro";

@Injectable({ providedIn: "root" })
export class ThemeService {
  private documento = inject(DOCUMENT);

  // Indica si el usuario eligió tema manualmente (true) o si se está
  // siguiendo automáticamente la preferencia del sistema (false). Sólo
  // así puede reaccionar a cambios futuros del SO sin pisar la elección
  // explícita del usuario.
  private eleccionManual = signal<boolean>(this.haGuardado());

  temaActual = signal<Tema>(this.temaInicial());

  constructor() {
    // Aplica la clase y persiste sólo si el cambio viene de una elección
    // manual; al inicializar con la preferencia del sistema no se guarda
    // para que el usuario pueda volver al modo automático borrando el
    // localStorage.
    effect(() => {
      const tema = this.temaActual();
      this.documento.documentElement.classList.toggle(CLASE_TEMA_CLARO, tema === "claro");

      if (this.eleccionManual()) {
        try {
          this.almacen()?.setItem(CLAVE_ALMACEN, tema);
        } catch {
          // Si localStorage está bloqueado (modo incógnito, política de
          // privacidad) seguimos funcionando: el tema se mantiene sólo
          // mientras dura la sesión.
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

  // Suscribe el servicio al cambio de la preferencia del sistema. Si el
  // usuario nunca ha pulsado el botón de cambio de tema, la app sigue
  // automáticamente lo que dicte el sistema operativo.
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
