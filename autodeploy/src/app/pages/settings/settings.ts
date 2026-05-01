import { Component, signal } from "@angular/core";
import { MigasPan } from "../../components/shared/migas-pan/migas-pan";
import { FormsModule } from "@angular/forms";

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

  mostrarFormularioClave = signal(false);
  nombreNuevaClave = signal("");
  contenidoNuevaClave = signal("");

  guardarConfiguracion(): void {
    this.mensajeGuardado.set("Settings saved");
    const componente = this;
    setTimeout(function() {
      componente.mensajeGuardado.set("");
    }, 3000);
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
