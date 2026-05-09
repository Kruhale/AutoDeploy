import { Component, signal } from "@angular/core";
import { Router } from "@angular/router";
import { MigasPan } from "../../components/shared/migas-pan/migas-pan";
import { FormsModule } from "@angular/forms";

interface OpcionTecnologia {
  icono: string;
  etiquetaTexto: string;
  nombre: string;
  descripcion: string;
}

interface OpcionTecnologiaSimple {
  valor: string;
  etiqueta: string;
}

@Component({
  selector: "app-nuevo-despliegue",
  imports: [MigasPan, FormsModule],
  templateUrl: "./nuevo-despliegue.html",
  styleUrl: "./nuevo-despliegue.scss"
})
export class NuevoDespliegue {
  tecnologiaSeleccionada = signal<string>("Docker Compose");
  tecnologiaValorSeleccionado = signal<string>("");
  origenCodigo = signal<"git" | "zip">("git");
  sslActivo = signal(true);
  desplegando = signal(false);
  repositorioUrl = signal("");
  rama = signal("main");
  directorioRaiz = signal("./");
  puertoAplicacion = signal("8080");
  dominio = signal("");

  opcionesTecnologiaSimple: OpcionTecnologiaSimple[] = [
    { valor: "node", etiqueta: "Node.js" },
    { valor: "python", etiqueta: "Python" },
    { valor: "php", etiqueta: "PHP" },
    { valor: "static", etiqueta: "Static HTML" },
    { valor: "docker", etiqueta: "Docker" },
  ];

  opcionesDeTecnologia = signal<OpcionTecnologia[]>([
    { icono: "fa-solid fa-gear", etiquetaTexto: "", nombre: "Docker Compose", descripcion: "Multi-container stack" },
    { icono: "fa-solid fa-cube", etiquetaTexto: "", nombre: "DDEV", descripcion: "Local to production" },
    { icono: "", etiquetaTexto: "JS", nombre: "Node.js", descripcion: "Runtime Javascript V8" },
    { icono: "", etiquetaTexto: "PHP", nombre: "PHP", descripcion: "FPM & Apache/Nginx" },
  ]);

  constructor(private router: Router) {}

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
    if (!this.repositorioUrl() && this.origenCodigo() === "git") {
      return;
    }

    this.desplegando.set(true);
    const componente = this;

    setTimeout(function() {
      componente.desplegando.set(false);
      componente.router.navigate(["/app/dashboard"]);
    }, 2000);
  }

  cancelar(): void {
    this.router.navigate(["/app/dashboard"]);
  }
}
