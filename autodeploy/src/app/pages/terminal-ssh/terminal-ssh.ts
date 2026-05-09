import { Component, ElementRef, ViewChild, OnDestroy, afterNextRender, signal } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { TerminalSshService } from "../../services/terminal-ssh.service";
import { ServidorService, ServidorRemoto } from "../../services/servidor.service";
import { Subscription } from "rxjs";

@Component({
  selector: "app-terminal-ssh",
  imports: [RouterLink, TranslateModule],
  templateUrl: "./terminal-ssh.html",
  styleUrl: "./terminal-ssh.scss"
})
export class TerminalSsh implements OnDestroy {
  @ViewChild("contenedorTerminal", { static: false }) contenedorTerminal!: ElementRef;

  nombreServidor = signal("—");
  ipServidor = signal("—");
  puertoServidor = signal(22);

  private terminal: Terminal | null = null;
  private fitAddon: FitAddon | null = null;
  private suscripcionDatos: Subscription | null = null;
  private manejadorRedimensionar: (() => void) | null = null;

  constructor(
    public terminalService: TerminalSshService,
    private servidorService: ServidorService,
    private ruta: ActivatedRoute
  ) {
    const componente = this;

    afterNextRender(function () {
      const servidorId = componente.ruta.snapshot.paramMap.get("servidorId");
      if (!servidorId) {
        return;
      }

      componente.servidorService.obtenerPorId(servidorId).subscribe({
        next: function (servidor: ServidorRemoto) {
          componente.nombreServidor.set(servidor.nombre);
          componente.ipServidor.set(servidor.direccionIp);
          componente.puertoServidor.set(servidor.puertoSsh);
        }
      });

      componente.inicializarTerminal(servidorId);
    });
  }

  private inicializarTerminal(servidorId: string): void {
    const componente = this;

    this.terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      theme: {
        // Mismo negro que --fondo-negro (hsl 230 8% 3%): xterm pinta su propio lienzo
        background: "#070708",
        foreground: "#e8e0d4",
        cursor: "#e2b93d",
        selectionBackground: "#e2b93d33",
        black: "#1a1917",
        red: "#d94035",
        green: "#2daf8c",
        yellow: "#e2b93d",
        blue: "#4a90d9",
        magenta: "#2daf8c",
        cyan: "#2a9d8f",
        white: "#e8e0d4"
      }
    });

    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.open(this.contenedorTerminal.nativeElement);
    this.fitAddon.fit();

    this.terminal.onData(function (datos: string) {
      componente.terminalService.enviarEntrada(datos);
    });

    this.suscripcionDatos = this.terminalService.datosRecibidos.subscribe(function (datos: string) {
      if (componente.terminal) {
        componente.terminal.write(datos);
      }
    });

    this.manejadorRedimensionar = function () {
      if (componente.fitAddon && componente.terminal) {
        componente.fitAddon.fit();
        componente.terminalService.enviarRedimensionar(componente.terminal.cols, componente.terminal.rows);
      }
    };
    window.addEventListener("resize", this.manejadorRedimensionar);

    this.terminalService.conectar(servidorId);
  }

  ngOnDestroy(): void {
    this.terminalService.desconectar();

    if (this.suscripcionDatos) {
      this.suscripcionDatos.unsubscribe();
    }

    if (this.terminal) {
      this.terminal.dispose();
    }

    if (this.manejadorRedimensionar) {
      window.removeEventListener("resize", this.manejadorRedimensionar);
    }
  }
}
