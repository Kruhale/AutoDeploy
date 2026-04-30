import { Component, signal } from "@angular/core";
import { MigasPan } from "../../components/shared/migas-pan/migas-pan";
import { FormsModule } from "@angular/forms";

interface Dominio {
  nombre: string;
  tipo: "primary" | "subdomain";
  sslActivo: boolean;
  sslExpira: string;
  estado: "active" | "propagating" | "error";
}

@Component({
  selector: "app-networking",
  imports: [MigasPan, FormsModule],
  templateUrl: "./networking.html",
  styleUrl: "./networking.scss"
})
export class Networking {
  listaDeDominios = signal<Dominio[]>([]);
  mostrarFormulario = signal(false);
  nuevoDominio = signal("");
  nuevoTipo = signal<"primary" | "subdomain">("primary");
  mensajeAccion = signal("");

  mostrarFormularioAgregar(): void {
    this.mostrarFormulario.set(true);
  }

  cancelarFormulario(): void {
    this.mostrarFormulario.set(false);
    this.nuevoDominio.set("");
  }

  agregarDominio(): void {
    const dominio = this.nuevoDominio();
    if (!dominio) {
      return;
    }

    const nuevoDominio: Dominio = {
      nombre: dominio,
      tipo: this.nuevoTipo(),
      sslActivo: false,
      sslExpira: "",
      estado: "propagating"
    };

    this.listaDeDominios.update(function(listaActual) {
      return [...listaActual, nuevoDominio];
    });

    this.cancelarFormulario();
  }

  renovarSsl(): void {
    this.mensajeAccion.set("SSL renewal initiated");
    const componente = this;
    setTimeout(function() {
      componente.mensajeAccion.set("");
    }, 3000);
  }

  verRegistrosDns(): void {
    this.mensajeAccion.set("DNS records loaded");
    const componente = this;
    setTimeout(function() {
      componente.mensajeAccion.set("");
    }, 3000);
  }

  configurarRedirecciones(): void {
    this.mensajeAccion.set("Redirect configuration opened");
    const componente = this;
    setTimeout(function() {
      componente.mensajeAccion.set("");
    }, 3000);
  }
}
