import { Component, inject, signal } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { AuthService } from "../../services/auth.service";
import { UsuarioService } from "../../services/usuario.service";

@Component({
  selector: "app-login",
  imports: [RouterLink, ReactiveFormsModule, TranslateModule],
  templateUrl: "./login.html",
  styleUrl: "./login.scss"
})
export class Login {
  // Formulario reactivo con validadores: email obligatorio + formato email, password obligatoria + minimo 8 caracteres
  private formBuilder = inject(FormBuilder);
  formularioLogin = this.formBuilder.nonNullable.group({
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required, Validators.minLength(8)]]
  });

  passwordEsVisible = signal(false);
  mensajeDeErrorVisible = signal(false);
  mensajeDeError = signal("");
  cargando = signal(false);
  intentoEnviar = signal(false);

  readonly codigoSesion = this.generarCodigoSesion();

  constructor(
    private router: Router,
    private authService: AuthService,
    private usuarioService: UsuarioService,
    private translate: TranslateService
  ) {}

  alternarVisibilidadPassword(): void {
    this.passwordEsVisible.update(function (estadoActual) {
      return !estadoActual;
    });
  }

  // Devuelve true si el campo ha sido tocado o se intento enviar Y tiene errores -> sirve para mostrar feedback inline
  campoConError(nombreCampo: "email" | "password"): boolean {
    const control = this.formularioLogin.controls[nombreCampo];
    return control.invalid && (control.touched || this.intentoEnviar());
  }

  // Devuelve el primer mensaje de error i18n del campo
  primerErrorDeCampo(nombreCampo: "email" | "password"): string {
    const control = this.formularioLogin.controls[nombreCampo];
    if (!control.errors) {
      return "";
    }
    if (control.errors["required"]) {
      const claveI18n = nombreCampo === "email" ? "login.errorEmailObligatorio" : "login.errorClaveObligatoria";
      return this.translate.instant(claveI18n);
    }
    if (nombreCampo === "email" && control.errors["email"]) {
      return this.translate.instant("login.errorEmailFormato");
    }
    if (nombreCampo === "password" && control.errors["minlength"]) {
      return this.translate.instant("login.errorClaveCorta");
    }
    return "";
  }

  async iniciarSesion(): Promise<void> {
    this.intentoEnviar.set(true);

    if (this.formularioLogin.invalid) {
      this.formularioLogin.markAllAsTouched();
      this.mensajeDeError.set(this.translate.instant("login.errorCamposVacios"));
      this.mensajeDeErrorVisible.set(true);
      return;
    }

    const { email, password } = this.formularioLogin.getRawValue();

    this.cargando.set(true);
    this.mensajeDeErrorVisible.set(false);

    try {
      await this.usuarioService.login(email, password);
      this.authService.login();
      this.router.navigate(["/app"]);
    } catch (error: any) {
      this.mensajeDeError.set(error.message || this.translate.instant("login.errorCredenciales"));
      this.mensajeDeErrorVisible.set(true);
    } finally {
      this.cargando.set(false);
    }
  }

  private generarCodigoSesion(): string {
    const aleatorio = Math.floor(Math.random() * 16777215)
      .toString(16)
      .toUpperCase();
    return ("000000" + aleatorio).slice(-6);
  }
}
