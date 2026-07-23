import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { TranslateModule } from "@ngx-translate/core";

@Component({
  selector: "app-contacto",
  imports: [TranslateModule, FormsModule],
  templateUrl: "./contacto.html",
})
export class Contacto {
  private readonly http = inject(HttpClient);

  protected readonly nombreUsuario = signal<string>("");
  protected readonly emailUsuario = signal<string>("");
  protected readonly asuntoMensaje = signal<string>("");
  protected readonly cuerpoMensaje = signal<string>("");
  protected readonly enviado = signal<boolean>(false);
  protected readonly error = signal<boolean>(false);

  // Antes componía un mailto (dependía del cliente de correo del visitante).
  // Ahora envía el mensaje al backend, que lo reenvía a un webhook de Discord.
  enviarPorEmail(): void {
    const asuntoLimpio = this.asuntoMensaje().trim();
    const cuerpoLimpio = this.cuerpoMensaje().trim();
    const nombreLimpio = this.nombreUsuario().trim();
    const emailLimpio = this.emailUsuario().trim();

    const formularioInvalido =
      asuntoLimpio === "" || cuerpoLimpio === "" || emailLimpio === "";
    if (formularioInvalido) {
      return;
    }

    this.error.set(false);
    this.http
      .post("/api/contacto", {
        nombre: nombreLimpio,
        email: emailLimpio,
        asunto: asuntoLimpio,
        mensaje: cuerpoLimpio,
      })
      .subscribe({
        next: () => this.enviado.set(true),
        error: () => this.error.set(true),
      });
  }

  resetearFormulario(): void {
    this.nombreUsuario.set("");
    this.emailUsuario.set("");
    this.asuntoMensaje.set("");
    this.cuerpoMensaje.set("");
    this.enviado.set(false);
    this.error.set(false);
  }
}
