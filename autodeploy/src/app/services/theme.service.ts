import { Injectable, signal, effect } from "@angular/core";

type Tema = "oscuro" | "claro";

@Injectable({ providedIn: "root" })
export class ThemeService {
  temaActual = signal<Tema>((localStorage.getItem("tema") as Tema) ?? "oscuro");

  constructor() {
    effect(() => {
      const tema = this.temaActual();
      localStorage.setItem("tema", tema);
      document.documentElement.classList.toggle("tema-claro", tema === "claro");
    });
  }

  alternarTema(): void {
    this.temaActual.update(t => (t === "oscuro" ? "claro" : "oscuro"));
  }
}
