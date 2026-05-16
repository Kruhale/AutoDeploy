import { Component, signal, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { ServidorService, ServidorRemoto } from "../../services/servidor.service";

interface ReglaFirewallApi {
  id: string;
  servidorId: string;
  puerto: string;
  protocolo: "TCP" | "UDP" | "TCP/UDP";
  accion: "allow" | "deny";
  origen: string;
  descripcion: string;
}

@Component({
  selector: "app-firewall",
  imports: [FormsModule],
  templateUrl: "./firewall.html",
  styleUrl: "./firewall.scss"
})
export class Firewall implements OnInit {
  listaDeReglas = signal<ReglaFirewallApi[]>([]);
  listaServidores = signal<ServidorRemoto[]>([]);
  servidorSeleccionadoId = signal<string>("");
  firewallActivo = signal(false);
  mostrarFormulario = signal(false);
  cargando = signal(true);
  guardando = signal(false);
  mensajeError = signal<string>("");

  nuevoPuerto = signal("");
  nuevoProtocolo = signal<"TCP" | "UDP" | "TCP/UDP">("TCP");
  nuevaAccion = signal<"allow" | "deny">("allow");
  nuevoOrigen = signal("0.0.0.0/0");
  nuevaDescripcion = signal("");

  constructor(
    private http: HttpClient,
    private servidorService: ServidorService
  ) {}

  ngOnInit(): void {
    this.cargarServidores();
  }

  private cargarServidores(): void {
    const componente = this;
    this.servidorService.listar().subscribe({
      next: function(servidores) {
        componente.listaServidores.set(servidores);
        if (servidores.length > 0) {
          componente.servidorSeleccionadoId.set(servidores[0].id);
          componente.cargarReglas(servidores[0].id);
        } else {
          componente.cargando.set(false);
        }
      },
      error: function() {
        componente.cargando.set(false);
      }
    });
  }

  cambiarServidor(idServidor: string): void {
    this.servidorSeleccionadoId.set(idServidor);
    this.cargarReglas(idServidor);
  }

  private cargarReglas(servidorId: string): void {
    this.cargando.set(true);
    const componente = this;
    this.http.get<any>("/api/firewall/servidor/" + servidorId).subscribe({
      next: function(respuesta: any) {
        const reglas: ReglaFirewallApi[] = Array.isArray(respuesta) ? respuesta : (respuesta && Array.isArray(respuesta.data) ? respuesta.data : []);
        componente.listaDeReglas.set(reglas);
        componente.firewallActivo.set(reglas.length > 0);
        componente.cargando.set(false);
      },
      error: function() {
        componente.listaDeReglas.set([]);
        componente.cargando.set(false);
      }
    });
  }

  agregarPreset(puerto: string, descripcion: string): void {
    const servidorId = this.servidorSeleccionadoId();
    if (!servidorId) return;

    const yaExiste = this.listaDeReglas().some(function(regla) { return regla.puerto === puerto; });
    if (yaExiste) return;

    const componente = this;
    this.guardando.set(true);
    this.http.post("/api/firewall/regla", {
      servidorId: servidorId,
      puerto: puerto,
      protocolo: "TCP",
      accion: "allow",
      origen: "0.0.0.0/0",
      descripcion: descripcion
    }).subscribe({
      next: function() {
        componente.guardando.set(false);
        componente.cargarReglas(servidorId);
      },
      error: function() {
        componente.guardando.set(false);
        componente.mensajeError.set("Could not add the preset rule");
        setTimeout(function() { componente.mensajeError.set(""); }, 3000);
      }
    });
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
    const servidorId = this.servidorSeleccionadoId();
    if (!puerto || !servidorId) return;

    this.guardando.set(true);
    const componente = this;
    this.http.post("/api/firewall/regla", {
      servidorId: servidorId,
      puerto: puerto,
      protocolo: this.nuevoProtocolo(),
      accion: this.nuevaAccion(),
      origen: this.nuevoOrigen(),
      descripcion: this.nuevaDescripcion()
    }).subscribe({
      next: function() {
        componente.guardando.set(false);
        componente.cancelarFormulario();
        componente.cargarReglas(servidorId);
      },
      error: function() {
        componente.guardando.set(false);
        componente.mensajeError.set("Could not add the rule");
        setTimeout(function() { componente.mensajeError.set(""); }, 3000);
      }
    });
  }

  eliminarRegla(idRegla: string): void {
    const componente = this;
    const servidorId = this.servidorSeleccionadoId();
    this.http.delete("/api/firewall/regla/" + idRegla).subscribe({
      next: function() {
        componente.cargarReglas(servidorId);
      },
      error: function() {
        componente.mensajeError.set("Could not remove the rule");
        setTimeout(function() { componente.mensajeError.set(""); }, 3000);
      }
    });
  }
}
