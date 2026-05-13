import { Component, signal } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { AuthService } from "../../services/auth.service";
import { UsuarioService } from "../../services/usuario.service";

@Component({
  selector: "app-login",
  imports: [RouterLink, FormsModule],
  templateUrl: "./login.html",
  styleUrl: "./login.scss"
})
export class Login {
  emailUsuario = signal("");
  passwordUsuario = signal("");

  passwordEsVisible = signal(false);
  mensajeDeErrorVisible = signal(false);
  mensajeDeError = signal("");
  cargando = signal(false);

  constructor(
    private router: Router,
    private authService: AuthService,
    private usuarioService: UsuarioService
  ) {}

  alternarVisibilidadPassword(): void {
    this.passwordEsVisible.update(function(estadoActualDeVisibilidad) {
      return !estadoActualDeVisibilidad;
    });
  }

  async iniciarSesion(): Promise<void> {
    const email = this.emailUsuario();
    const password = this.passwordUsuario();

    if (!email || !password) {
      this.mensajeDeError.set("Email and password are required");
      this.mensajeDeErrorVisible.set(true);
      return;
    }

    this.cargando.set(true);
    this.mensajeDeErrorVisible.set(false);

    try {
      await this.usuarioService.login(email, password);
      this.authService.login();
      this.router.navigate(["/app"]);
    } catch (error: any) {
      this.mensajeDeError.set(error.message || "Invalid credentials");
      this.mensajeDeErrorVisible.set(true);
    } finally {
      this.cargando.set(false);
    }
  }
}
