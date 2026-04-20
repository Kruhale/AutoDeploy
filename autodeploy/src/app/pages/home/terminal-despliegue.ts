import { Component, signal, AfterViewInit, OnDestroy } from "@angular/core";
import { TranslateModule } from "@ngx-translate/core";

// Log de despliegue tecleado en bucle: el contrapunto vivo al titular
// "Sin terminal" — la terminal existe y trabaja sola, tu nunca la tocas.
type LineaDeTerminal = { tipo: "comando" | "paso" | "final"; texto: string };

const GUION_DE_DESPLIEGUE: LineaDeTerminal[] = [
  { tipo: "comando", texto: "autodeploy push miapp" },
  { tipo: "paso", texto: "ssh    root@203.0.113.10 ...... ok" },
  { tipo: "paso", texto: "git    pull origin main ....... ok" },
  { tipo: "paso", texto: "docker build -t miapp . ....... ok" },
  { tipo: "paso", texto: "nginx  + certbot --ssl ........ ok" },
  { tipo: "final", texto: "live   https://miapp.tudominio.dev" }
];

const MS_POR_CARACTER = 24;
const MS_ENTRE_LINEAS = 240;
const MS_PAUSA_AL_TERMINAR = 2600;
const MS_TICK_DEL_TIMER = 100;

@Component({
  selector: "app-terminal-despliegue",
  imports: [TranslateModule],
  templateUrl: "./terminal-despliegue.html"
})
export class TerminalDespliegue implements AfterViewInit, OnDestroy {
  lineasEscritas = signal<LineaDeTerminal[]>([]);
  lineaEnCurso = signal<LineaDeTerminal | null>(null);
  // Cronometro real del despliegue simulado: corre mientras teclea y se
  // congela al llegar la linea "live" (numeros tabulares en el SCSS).
  decimasTranscurridas = signal(0);
  mostrarTimer = signal(false);

  private indiceDeLinea = 0;
  private indiceDeCaracter = 0;
  private idDelTemporizador = 0;
  private idDelIntervaloTimer = 0;
  private bucleActivo = false;

  ngAfterViewInit(): void {
    const prefiereMenosMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefiereMenosMovimiento) {
      this.mostrarGuionEntero();
      return;
    }
    this.bucleActivo = true;
    this.mostrarTimer.set(true);
    this.arrancarTimer();
    this.programarPaso(MS_ENTRE_LINEAS);
  }

  ngOnDestroy(): void {
    this.bucleActivo = false;
    window.clearTimeout(this.idDelTemporizador);
    window.clearInterval(this.idDelIntervaloTimer);
  }

  prefijoDeLinea(tipo: string): string {
    if (tipo === "comando") {
      return "$";
    }
    if (tipo === "final") {
      return "●";
    }
    return "↳";
  }

  // Numero de linea del gutter, con cero a la izquierda como un listing.
  numeroDeLinea(indice: number): string {
    const numeroReal = indice + 1;
    return ("0" + numeroReal).slice(-2);
  }

  segundosFormateados(): string {
    const segundos = this.decimasTranscurridas() / 10;
    return segundos.toFixed(1) + "s";
  }

  // Reduced-motion: el guion aparece entero y quieto, sin tecleo ni timer.
  private mostrarGuionEntero(): void {
    this.lineasEscritas.set(GUION_DE_DESPLIEGUE.slice());
    this.lineaEnCurso.set(null);
  }

  private arrancarTimer(): void {
    const componente = this;
    this.idDelIntervaloTimer = window.setInterval(function () {
      componente.decimasTranscurridas.update(function (decimas) {
        return decimas + 1;
      });
    }, MS_TICK_DEL_TIMER);
  }

  // Un paso del bucle: escribe un caracter, cierra una linea o reinicia el guion.
  private ejecutarPaso(): void {
    if (!this.bucleActivo) {
      return;
    }

    if (this.indiceDeLinea >= GUION_DE_DESPLIEGUE.length) {
      this.reiniciarGuion();
      return;
    }

    const lineaObjetivo = GUION_DE_DESPLIEGUE[this.indiceDeLinea];

    if (this.indiceDeCaracter >= lineaObjetivo.texto.length) {
      const yaEscritas = this.lineasEscritas().concat(lineaObjetivo);
      this.lineasEscritas.set(yaEscritas);
      this.lineaEnCurso.set(null);
      this.indiceDeLinea = this.indiceDeLinea + 1;
      this.indiceDeCaracter = 0;

      // El despliegue "termina" al fijarse la linea live: el timer se congela
      // en el total real hasta que el guion vuelve a empezar.
      if (this.indiceDeLinea >= GUION_DE_DESPLIEGUE.length) {
        window.clearInterval(this.idDelIntervaloTimer);
      }

      this.programarPaso(MS_ENTRE_LINEAS);
      return;
    }

    this.indiceDeCaracter = this.indiceDeCaracter + 1;
    const textoParcial = lineaObjetivo.texto.slice(0, this.indiceDeCaracter);
    this.lineaEnCurso.set({ tipo: lineaObjetivo.tipo, texto: textoParcial });
    this.programarPaso(MS_POR_CARACTER);
  }

  private reiniciarGuion(): void {
    this.indiceDeLinea = 0;
    this.indiceDeCaracter = 0;
    this.lineasEscritas.set([]);
    this.lineaEnCurso.set(null);
    this.decimasTranscurridas.set(0);
    this.arrancarTimer();
    this.programarPaso(MS_ENTRE_LINEAS);
  }

  private programarPaso(retardoBase: number): void {
    const componente = this;
    // Tras la ultima linea la pausa es mas larga: se lee el resultado desplegado
    // antes de que el guion vuelva a empezar.
    const guionTerminado = this.indiceDeLinea >= GUION_DE_DESPLIEGUE.length;
    const retardoReal = guionTerminado ? MS_PAUSA_AL_TERMINAR : retardoBase;
    this.idDelTemporizador = window.setTimeout(function () {
      componente.ejecutarPaso();
    }, retardoReal);
  }
}
