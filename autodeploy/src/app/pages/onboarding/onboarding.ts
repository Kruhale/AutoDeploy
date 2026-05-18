import { Component, signal } from "@angular/core";
import { Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { ServidorService, PeticionConexionSsh } from "../../services/servidor.service";

@Component({
  selector: "app-onboarding",
  imports: [FormsModule, TranslateModule],
  templateUrl: "./onboarding.html",
  styleUrl: "./onboarding.scss"
})
export class Onboarding {
  metodoAutenticacion = signal<"key" | "password">("key");

  nombreServidor = signal("");
  direccionIp = signal("");
  puertoSsh = signal("22");
  usuarioSsh = signal("root");
  passwordServidor = signal("");
  claveSshPrivada = signal("");

  conectando = signal(false);
  estadoConexion = signal<"waiting" | "testing" | "success" | "error">("waiting");
  mensajeEstado = signal("");

  constructor(
    private servidorService: ServidorService,
    private router: Router,
    private translate: TranslateService
  ) {
    this.mensajeEstado.set(this.translate.instant("onboarding.estado.esperando"));
  }

  cambiarMetodoAuth(nuevoMetodoDeAutenticacion: "key" | "password"): void {
    this.metodoAutenticacion.set(nuevoMetodoDeAutenticacion);
  }

  conectarServidor(): void {
    const nombre = this.nombreServidor();
    const ip = this.direccionIp();

    if (!nombre || !ip) {
      this.estadoConexion.set("error");
      this.mensajeEstado.set(this.translate.instant("onboarding.errorNombreIp"));
      return;
    }

    this.conectando.set(true);
    this.estadoConexion.set("testing");
    this.mensajeEstado.set(this.translate.instant("onboarding.estado.probando"));

    const peticion: PeticionConexionSsh = {
      nombre: nombre,
      direccionIp: ip,
      puertoSsh: parseInt(this.puertoSsh(), 10),
      usuarioSsh: this.usuarioSsh(),
      metodoAutenticacion: this.metodoAutenticacion(),
      password: this.passwordServidor(),
      claveSshPrivada: this.claveSshPrivada()
    };

    const componente = this;

    this.servidorService.registrar(peticion).subscribe({
      next: function(servidor) {
        componente.estadoConexion.set("success");
        componente.mensajeEstado.set(componente.translate.instant("onboarding.estado.conectado"));
        componente.conectando.set(false);
        componente.router.navigate(["/app/terminal", servidor.id]);
      },
      error: function(error) {
        componente.estadoConexion.set("error");
        componente.mensajeEstado.set(componente.translate.instant("onboarding.estado.fallido"));
        componente.conectando.set(false);
      }
    });
  }
}
