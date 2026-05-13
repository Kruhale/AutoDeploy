import { Component, signal } from "@angular/core";
import { MigasPan } from "../../components/shared/migas-pan/migas-pan";
import { FormsModule } from "@angular/forms";
import { UsuarioService } from "../../services/usuario.service";

interface ClaveSsh {
  nombre: string;
  huella: string;
  fechaCreacion: string;
}

@Component({
  selector: "app-settings",
  imports: [MigasPan, FormsModule],
  templateUrl: "./settings.html",
  styleUrl: "./settings.scss"
})
export class Settings {
  listaDeClavesSsh = signal<ClaveSsh[]>([]);
  notificacionesEmail = signal(true);
  notificacionesAlertasCriticas = signal(true);

  hostname = signal("");
  timezone = signal("UTC");
  mensajeGuardado = signal("");
  mensajeError = signal("");

  nombreCuenta = signal("");
  emailCuenta = signal("");

  mostrarFormularioClave = signal(false);
  nombreNuevaClave = signal("");
  contenidoNuevaClave = signal("");

  constructor(private usuarioService: UsuarioService) {
    this.nombreCuenta.set(this.usuarioService.nombre());
    this.emailCuenta.set(this.usuarioService.email());
  }

  guardarConfiguracion(): void {
    this.mensajeGuardado.set("Settings saved");
    const componente = this;
    setTimeout(function() {
      componente.mensajeGuardado.set("");
    }, 3000);
  }

  guardarCuenta(): void {
    const nombreActual = this.nombreCuenta();
    const emailActual = this.emailCuenta();
    const componente = this;

    if (!nombreActual || !emailActual) {
      return;
    }

    this.usuarioService.actualizarPerfil(nombreActual, emailActual).then(function() {
      componente.mensajeGuardado.set("Account updated");
      setTimeout(function() {
        componente.mensajeGuardado.set("");
      }, 3000);
    }).catch(function() {
      componente.mensajeError.set("Error al guardar los cambios");
      setTimeout(function() {
        componente.mensajeError.set("");
      }, 3000);
    });
  }

  mostrarFormularioAgregarClave(): void {
    this.mostrarFormularioClave.set(true);
  }

  cancelarFormularioClave(): void {
    this.mostrarFormularioClave.set(false);
    this.nombreNuevaClave.set("");
    this.contenidoNuevaClave.set("");
  }

  agregarClaveSsh(): void {
    const nombre = this.nombreNuevaClave();
    const contenido = this.contenidoNuevaClave();

    if (!nombre || !contenido) {
      return;
    }

    const huellaGenerada = "SHA256:" + Math.random().toString(36).substring(2, 14);
    const fechaActual = new Date().toISOString().split("T")[0];

    const nuevaClave: ClaveSsh = {
      nombre: nombre,
      huella: huellaGenerada,
      fechaCreacion: fechaActual
    };

    this.listaDeClavesSsh.update(function(listaActual) {
      return [...listaActual, nuevaClave];
    });

    this.cancelarFormularioClave();
  }

  eliminarClaveSsh(huella: string): void {
    this.listaDeClavesSsh.update(function(listaActual) {
      return listaActual.filter(function(clave) {
        return clave.huella !== huella;
      });
    });
  }
}
