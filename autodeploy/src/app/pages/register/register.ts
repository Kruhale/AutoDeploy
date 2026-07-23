import { Component, computed, inject, signal, Signal } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from "@angular/forms";
import { toSignal } from "@angular/core/rxjs-interop";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { AuthService } from "../../services/auth.service";
import { UsuarioService } from "../../services/usuario.service";

// Validador cruzado: la confirmacion debe coincidir con la password
function confirmarPasswordCoincide(): ValidatorFn {
  return function (grupo: AbstractControl): ValidationErrors | null {
    const password = grupo.get("password")?.value;
    const confirmar = grupo.get("confirmPassword")?.value;
    if (!password || !confirmar) {
      return null;
    }
    return password === confirmar ? null : { noCoincide: true };
  };
}

@Component({
  selector: "app-register",
  imports: [RouterLink, ReactiveFormsModule, TranslateModule],
  templateUrl: "./register.html",
  styleUrl: "./register.scss"
})
export class Register {
  // Formulario reactivo con validadores por campo + validador de grupo para la confirmacion
  private formBuilder = inject(FormBuilder);
  formularioRegistro = this.formBuilder.nonNullable.group(
    {
      nombre: ["", [Validators.required, Validators.minLength(2)]],
      email: ["", [Validators.required, Validators.email]],
      password: ["", [Validators.required, Validators.minLength(8)]],
      confirmPassword: ["", [Validators.required]]
    },
    { validators: confirmarPasswordCoincide() }
  );

  // Signal con el valor en vivo de password para que los criterios reactivos sigan funcionando como antes
  private passwordControl = this.formularioRegistro.controls.password;
  private passwordSignal = toSignal(this.passwordControl.valueChanges, { initialValue: "" });

  passwordEsVisible = signal(false);
  confirmPasswordEsVisible = signal(false);
  mensajeDeErrorVisible = signal(false);
  mensajeDeError = signal("");
  cargando = signal(false);
  intentoEnviar = signal(false);

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

    this.criterioLongitud = computed(function () {
      return (componente.passwordSignal() ?? "").length >= 8;
    });
    this.criterioMayuscula = computed(function () {
      return /[A-Z]/.test(componente.passwordSignal() ?? "");
    });
    this.criterioMinuscula = computed(function () {
      return /[a-z]/.test(componente.passwordSignal() ?? "");
    });
    this.criterioNumero = computed(function () {
      return /[0-9]/.test(componente.passwordSignal() ?? "");
    });
    this.criterioEspecial = computed(function () {
      return /[^A-Za-z0-9]/.test(componente.passwordSignal() ?? "");
    });
    this.passwordEsValida = computed(function () {
      return componente.criterioLongitud() && componente.criterioMayuscula() && componente.criterioMinuscula() && componente.criterioNumero() && componente.criterioEspecial();
    });
  }

  alternarVisibilidadPassword(): void {
    this.passwordEsVisible.update(function (valor) {
      return !valor;
    });
  }

  alternarVisibilidadConfirmPassword(): void {
    this.confirmPasswordEsVisible.update(function (valor) {
      return !valor;
    });
  }

  passwordEnElInput(): string {
    return this.passwordSignal() ?? "";
  }

  hayConfirmacionInvalida(): boolean {
    const formularioInvalido = this.formularioRegistro.errors?.["noCoincide"] === true;
    const intento = this.intentoEnviar();
    const controlConfirmacion = this.formularioRegistro.controls.confirmPassword;
    const tocado = controlConfirmacion.touched || intento;
    return formularioInvalido && tocado;
  }

  campoConError(nombreCampo: "nombre" | "email" | "password" | "confirmPassword"): boolean {
    const control = this.formularioRegistro.controls[nombreCampo];
    return control.invalid && (control.touched || this.intentoEnviar());
  }

  async crearCuenta(): Promise<void> {
    this.intentoEnviar.set(true);

    if (this.formularioRegistro.invalid || !this.passwordEsValida()) {
      this.formularioRegistro.markAllAsTouched();

      if (!this.passwordEsValida()) {
        this.mensajeDeError.set(this.translate.instant("register.errorPasswordInvalida"));
      } else if (this.formularioRegistro.errors?.["noCoincide"]) {
        this.mensajeDeError.set(this.translate.instant("register.errorPasswordsNoCoinciden"));
      } else {
        this.mensajeDeError.set(this.translate.instant("register.errorCamposVacios"));
      }
      this.mensajeDeErrorVisible.set(true);
      return;
    }

    const { nombre, email, password } = this.formularioRegistro.getRawValue();

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
    const aleatorio = Math.floor(Math.random() * 16777215)
      .toString(16)
      .toUpperCase();
    return ("000000" + aleatorio).slice(-6);
  }
}
