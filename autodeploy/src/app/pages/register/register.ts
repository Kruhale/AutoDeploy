import { Component, signal, computed, Signal } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { AuthService } from "../../services/auth.service";
import { UsuarioService } from "../../services/usuario.service";

@Component({
  selector: "app-register",
  imports: [RouterLink, FormsModule, TranslateModule],
  templateUrl: "./register.html",
  styleUrl: "./register.scss"
})
export class Register {
  nombreCompleto = signal("");
  emailUsuario = signal("");
  passwordUsuario = signal("");
  confirmPasswordUsuario = signal("");

  passwordEsVisible = signal(false);
  confirmPasswordEsVisible = signal(false);
  mensajeDeErrorVisible = signal(false);
  mensajeDeError = signal("");
  cargando = signal(false);

  criterioLongitud: Signal<boolean>;
  criterioMayuscula: Signal<boolean>;
  criterioMinuscula: Signal<boolean>;
  criterioNumero: Signal<boolean>;
  criterioEspecial: Signal<boolean>;
  passwordEsValida: Signal<boolean>;

  readonly codigoSesion = this.generarCodigoSesion();

  constructor(
    private router: Router,
    private authService: AuthService,
    private usuarioService: UsuarioService,
    private translate: TranslateService
  ) {
    const componente = this;

    this.criterioLongitud = computed(function() {
      return componente.passwordUsuario().length >= 8;
    });

    this.criterioMayuscula = computed(function() {
      return /[A-Z]/.test(componente.passwordUsuario());
    });

    this.criterioMinuscula = computed(function() {
      return /[a-z]/.test(componente.passwordUsuario());
    });

    this.criterioNumero = computed(function() {
      return /[0-9]/.test(componente.passwordUsuario());
    });

    this.criterioEspecial = computed(function() {
      return /[^A-Za-z0-9]/.test(componente.passwordUsuario());
    });

    this.passwordEsValida = computed(function() {
      return componente.criterioLongitud()
        && componente.criterioMayuscula()
        && componente.criterioMinuscula()
        && componente.criterioNumero()
        && componente.criterioEspecial();
    });
  }

  alternarVisibilidadPassword(): void {
    this.passwordEsVisible.update(function(valor) {
      return !valor;
    });
  }

  alternarVisibilidadConfirmPassword(): void {
    this.confirmPasswordEsVisible.update(function(valor) {
      return !valor;
    });
  }

  async crearCuenta(): Promise<void> {
    const nombre = this.nombreCompleto();
    const email = this.emailUsuario();
    const password = this.passwordUsuario();
    const confirmPassword = this.confirmPasswordUsuario();

    if (!nombre || !email || !password) {
      this.mensajeDeError.set(this.translate.instant("register.errorCamposVacios"));
      this.mensajeDeErrorVisible.set(true);
      return;
    }

    if (!this.passwordEsValida()) {
      this.mensajeDeError.set(this.translate.instant("register.errorPasswordInvalida"));
      this.mensajeDeErrorVisible.set(true);
      return;
    }

    if (password !== confirmPassword) {
      this.mensajeDeError.set(this.translate.instant("register.errorPasswordsNoCoinciden"));
      this.mensajeDeErrorVisible.set(true);
      return;
    }

    this.cargando.set(true);
    this.mensajeDeErrorVisible.set(false);

    try {
      await this.usuarioService.registrar(nombre, email, password);
      await this.usuarioService.login(email, password);
      this.authService.login();
      this.router.navigate(["/app"]);
    } catch (error: any) {
      this.mensajeDeError.set(error.message || this.translate.instant("register.errorRegistro"));
      this.mensajeDeErrorVisible.set(true);
    } finally {
      this.cargando.set(false);
    }
  }

  private generarCodigoSesion(): string {
    const aleatorio = Math.floor(Math.random() * 16777215).toString(16).toUpperCase();
    return ("000000" + aleatorio).slice(-6);
  }
}
