import { Injectable, signal } from "@angular/core";

@Injectable({ providedIn: "root" })
export class CookiesService {
  consentimientoDado = signal(localStorage.getItem("cookies") !== null);

  aceptar(): void {
    localStorage.setItem("cookies", "aceptadas");
    this.consentimientoDado.set(true);
  }

  rechazar(): void {
    localStorage.setItem("cookies", "rechazadas");
    this.consentimientoDado.set(true);
  }
}
