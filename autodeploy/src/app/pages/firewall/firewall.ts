import { Component, signal } from "@angular/core";
import { MigasPan } from "../../components/shared/migas-pan/migas-pan";
import { FormsModule } from "@angular/forms";

interface ReglaFirewall {
  puerto: string;
  protocolo: "TCP" | "UDP" | "TCP/UDP";
  accion: "allow" | "deny";
  origen: string;
  descripcion: string;
}

@Component({
  selector: "app-firewall",
  imports: [MigasPan, FormsModule],
  templateUrl: "./firewall.html",
  styleUrl: "./firewall.scss"
})
export class Firewall {
  listaDeReglas = signal<ReglaFirewall[]>([]);
  firewallActivo = signal(false);
  mostrarFormulario = signal(false);

  nuevoPuerto = signal("");
  nuevoProtocolo = signal<"TCP" | "UDP" | "TCP/UDP">("TCP");
  nuevaAccion = signal<"allow" | "deny">("allow");
  nuevoOrigen = signal("0.0.0.0/0");
  nuevaDescripcion = signal("");

  agregarPreset(puerto: string, descripcion: string): void {
    const reglaExistente = this.listaDeReglas().find(function(regla) {
      return regla.puerto === puerto;
    });

    if (reglaExistente) {
      return;
    }

    const nuevaRegla: ReglaFirewall = {
      puerto: puerto,
      protocolo: "TCP",
      accion: "allow",
      origen: "0.0.0.0/0",
      descripcion: descripcion
    };

    this.listaDeReglas.update(function(listaActual) {
      return [...listaActual, nuevaRegla];
    });

    if (!this.firewallActivo()) {
      this.firewallActivo.set(true);
    }
  }

  mostrarFormularioAgregar(): void {
    this.mostrarFormulario.set(true);
  }

  cancelarFormulario(): void {
    this.mostrarFormulario.set(false);
    this.nuevoPuerto.set("");
    this.nuevaDescripcion.set("");
  }

  agregarRegla(): void {
    const puerto = this.nuevoPuerto();
    if (!puerto) {
      return;
    }

    const nuevaRegla: ReglaFirewall = {
      puerto: puerto,
      protocolo: this.nuevoProtocolo(),
      accion: this.nuevaAccion(),
      origen: this.nuevoOrigen(),
      descripcion: this.nuevaDescripcion()
    };

    this.listaDeReglas.update(function(listaActual) {
      return [...listaActual, nuevaRegla];
    });

    this.cancelarFormulario();

    if (!this.firewallActivo()) {
      this.firewallActivo.set(true);
    }
  }

  eliminarRegla(puerto: string): void {
    this.listaDeReglas.update(function(listaActual) {
      return listaActual.filter(function(regla) {
        return regla.puerto !== puerto;
      });
    });
  }
}
