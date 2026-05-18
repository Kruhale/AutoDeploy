import { Component, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { TranslateModule } from "@ngx-translate/core";

@Component({
  selector: "app-contacto",
  imports: [TranslateModule, FormsModule],
  templateUrl: "./contacto.html",
})
export class Contacto {
  protected readonly nombreUsuario = signal<string>("");
  protected readonly emailUsuario = signal<string>("");
  protected readonly asuntoMensaje = signal<string>("");
  protected readonly cuerpoMensaje = signal<string>("");
  protected readonly enviado = signal<boolean>(false);

  private readonly correoDestino = "contacto@autodeploy.dev";

  enviarPorEmail(): void {
    const asuntoLimpio = this.asuntoMensaje().trim();
    const cuerpoLimpio = this.cuerpoMensaje().trim();
    const nombreLimpio = this.nombreUsuario().trim();
    const emailLimpio = this.emailUsuario().trim();

    const formularioInvalido = asuntoLimpio === "" || cuerpoLimpio === "" || emailLimpio === "";
    if (formularioInvalido) {
      return;
    }

    const firmaUsuario = `\n\n---\n${nombreLimpio}\n${emailLimpio}`;
    const cuerpoFinal = cuerpoLimpio + firmaUsuario;
    const enlaceMailto = `mailto:${this.correoDestino}?subject=${encodeURIComponent(asuntoLimpio)}&body=${encodeURIComponent(cuerpoFinal)}`;

    window.location.href = enlaceMailto;
    this.enviado.set(true);
  }

  resetearFormulario(): void {
    this.nombreUsuario.set("");
    this.emailUsuario.set("");
    this.asuntoMensaje.set("");
    this.cuerpoMensaje.set("");
    this.enviado.set(false);
  }
}
