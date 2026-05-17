import { Component, signal, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { ServidorService, ServidorRemoto } from "../../services/servidor.service";

interface OpcionTecnologia {
  icono: string;
  etiquetaTexto: string;
  nombre: string;
  descripcion: string;
}

@Component({
  selector: "app-nuevo-despliegue",
  imports: [FormsModule],
  templateUrl: "./nuevo-despliegue.html",
  styleUrl: "./nuevo-despliegue.scss"
})
export class NuevoDespliegue implements OnInit {
  tecnologiaSeleccionada = signal<string>("Docker Compose");
  origenCodigo = signal<"git" | "zip">("git");
  sslActivo = signal(true);
  desplegando = signal(false);
  repositorioUrl = signal("");
  rama = signal("main");
  directorioRaiz = signal("./");
  puertoAplicacion = signal("8080");
  dominio = signal("");
  servidorDestinoId = signal<string>("");
  listaServidores = signal<ServidorRemoto[]>([]);
  mensajeError = signal<string>("");
  mensajeExito = signal<string>("");

  opcionesDeTecnologia = signal<OpcionTecnologia[]>([
    { icono: "fa-solid fa-gear", etiquetaTexto: "", nombre: "Docker Compose", descripcion: "Multi-container stack" },
    { icono: "fa-solid fa-cube", etiquetaTexto: "", nombre: "DDEV", descripcion: "Local to production" },
    { icono: "", etiquetaTexto: "JS", nombre: "Node.js", descripcion: "Runtime Javascript V8" },
    { icono: "", etiquetaTexto: "PHP", nombre: "PHP", descripcion: "FPM & Apache/Nginx" },
  ]);

  constructor(
    private router: Router,
    private http: HttpClient,
    private servidorService: ServidorService
  ) {}

  ngOnInit(): void {
    this.cargarServidores();
  }

  private cargarServidores(): void {
    const componente = this;
    this.servidorService.listar().subscribe({
      next: function(servidores: ServidorRemoto[]) {
        componente.listaServidores.set(servidores);
        if (servidores.length > 0 && !componente.servidorDestinoId()) {
          componente.servidorDestinoId.set(servidores[0].id);
        }
      }
    });
  }

  seleccionarTecnologia(nombre: string): void {
    this.tecnologiaSeleccionada.set(nombre);
  }

  cambiarOrigenCodigo(origen: "git" | "zip"): void {
    this.origenCodigo.set(origen);
  }

  alternarSsl(): void {
    this.sslActivo.update(function(valor) {
      return !valor;
    });
  }

  lanzarDespliegue(): void {
    if (this.origenCodigo() === "git" && !this.repositorioUrl()) {
      this.mensajeError.set("Repository URL is required for Git deployments.");
      return;
    }
    if (!this.servidorDestinoId()) {
      this.mensajeError.set("Pick a target server.");
      return;
    }

    this.mensajeError.set("");
    this.mensajeExito.set("");
    this.desplegando.set(true);

    const componente = this;
    const cuerpo = {
      servidorId: this.servidorDestinoId(),
      tipo: this.tecnologiaSeleccionada(),
      url: this.repositorioUrl() || this.dominio() || null
    };

    this.http.post<{ success: boolean; message: string; data: any }>("/api/despliegues", cuerpo).subscribe({
      next: function(respuesta) {
        componente.desplegando.set(false);
        componente.mensajeExito.set("Deployment registered. Redirecting to dashboard…");
        setTimeout(function() {
          componente.router.navigate(["/app/dashboard"]);
        }, 1500);
      },
      error: function(error) {
        componente.desplegando.set(false);
        const detalle = error && error.error && error.error.message ? error.error.message : "Could not register the deployment.";
        componente.mensajeError.set(detalle);
      }
    });
  }

  cancelar(): void {
    this.router.navigate(["/app/dashboard"]);
  }
}
