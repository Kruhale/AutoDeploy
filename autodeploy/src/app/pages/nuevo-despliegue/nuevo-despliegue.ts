import { Component, signal, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { HttpClient, HttpEventType } from "@angular/common/http";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { ServidorService, ServidorRemoto } from "../../services/servidor.service";

interface OpcionTecnologia {
  icono: string;
  etiquetaTexto: string;
  nombre: string;
  descripcion: string;
}

@Component({
  selector: "app-nuevo-despliegue",
  imports: [FormsModule, TranslateModule],
  templateUrl: "./nuevo-despliegue.html",
  styleUrl: "./nuevo-despliegue.scss"
})
export class NuevoDespliegue implements OnInit {
  tecnologiaSeleccionada = signal<string>("");
  origenCodigo = signal<"git" | "zip">("git");
  sslActivo = signal(true);
  desplegando = signal(false);
  repositorioUrl = signal("");
  rama = signal("main");
  directorioRemotoGit = signal("~/apps/miapp");
  puertoAplicacion = signal("8080");
  dominio = signal("");
  servidorDestinoId = signal<string>("");
  listaServidores = signal<ServidorRemoto[]>([]);
  mensajeError = signal<string>("");
  mensajeExito = signal<string>("");

  archivoZipSeleccionado = signal<File | null>(null);
  archivoArrastrandose = signal(false);
  directorioRemotoZip = signal<string>("/var/www/miapp");
  progresoSubida = signal<number>(0);

  opcionesDeTecnologia = signal<OpcionTecnologia[]>([]);

  constructor(
    private router: Router,
    private http: HttpClient,
    private servidorService: ServidorService,
    private translate: TranslateService
  ) {
    this.opcionesDeTecnologia.set([
      { icono: "fa-solid fa-gear", etiquetaTexto: "", nombre: this.translate.instant("nuevoDespliegue.opciones.dockerComposeNombre"), descripcion: this.translate.instant("nuevoDespliegue.opciones.dockerComposeDescripcion") },
      { icono: "fa-solid fa-cube", etiquetaTexto: "", nombre: this.translate.instant("nuevoDespliegue.opciones.ddevNombre"), descripcion: this.translate.instant("nuevoDespliegue.opciones.ddevDescripcion") },
      { icono: "", etiquetaTexto: "JS", nombre: this.translate.instant("nuevoDespliegue.opciones.nodejsNombre"), descripcion: this.translate.instant("nuevoDespliegue.opciones.nodejsDescripcion") },
      { icono: "", etiquetaTexto: "PHP", nombre: this.translate.instant("nuevoDespliegue.opciones.phpNombre"), descripcion: this.translate.instant("nuevoDespliegue.opciones.phpDescripcion") },
    ]);
    this.tecnologiaSeleccionada.set(this.translate.instant("nuevoDespliegue.opciones.dockerComposeNombre"));
  }

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
    this.mensajeError.set("");
    this.mensajeExito.set("");
  }

  alternarSsl(): void {
    this.sslActivo.update(function(valor) {
      return !valor;
    });
  }

  onDragOver(evento: DragEvent): void {
    evento.preventDefault();
    this.archivoArrastrandose.set(true);
  }

  onDragLeave(evento: DragEvent): void {
    evento.preventDefault();
    this.archivoArrastrandose.set(false);
  }

  onDropArchivo(evento: DragEvent): void {
    evento.preventDefault();
    this.archivoArrastrandose.set(false);
    const archivos = evento.dataTransfer?.files;
    if (archivos && archivos.length > 0) {
      this.aceptarArchivo(archivos[0]);
    }
  }

  onSeleccionarArchivo(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    if (entrada.files && entrada.files.length > 0) {
      this.aceptarArchivo(entrada.files[0]);
    }
  }

  private aceptarArchivo(archivo: File): void {
    const esZip = archivo.name.toLowerCase().endsWith(".zip");
    if (!esZip) {
      this.mensajeError.set(this.translate.instant("nuevoDespliegue.errores.solamenteZip"));
      return;
    }
    const tamanoMaximoBytes = 50 * 1024 * 1024;
    if (archivo.size > tamanoMaximoBytes) {
      this.mensajeError.set(this.translate.instant("nuevoDespliegue.errores.zipDemasiadoGrande"));
      return;
    }
    this.archivoZipSeleccionado.set(archivo);
    this.mensajeError.set("");
  }

  quitarArchivo(evento: Event): void {
    evento.stopPropagation();
    this.archivoZipSeleccionado.set(null);
    this.progresoSubida.set(0);
  }

  tamanoLegible(bytes: number): string {
    if (bytes < 1024) {
      return bytes + " B";
    }
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + " KB";
    }
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  lanzarDespliegue(): void {
    this.mensajeError.set("");
    this.mensajeExito.set("");

    if (!this.servidorDestinoId()) {
      this.mensajeError.set(this.translate.instant("nuevoDespliegue.errores.elegirServidor"));
      return;
    }

    if (this.origenCodigo() === "git") {
      this.lanzarDespliegueGit();
    } else {
      this.lanzarDespliegueZip();
    }
  }

  private lanzarDespliegueGit(): void {
    if (!this.repositorioUrl()) {
      this.mensajeError.set(this.translate.instant("nuevoDespliegue.errores.repositorioRequerido"));
      return;
    }
    if (!this.directorioRemotoGit().trim()) {
      this.mensajeError.set(this.translate.instant("nuevoDespliegue.errores.directorioRequerido"));
      return;
    }

    this.desplegando.set(true);
    const componente = this;
    const cuerpo = {
      servidorId: this.servidorDestinoId(),
      repoUrl: this.repositorioUrl(),
      directorio: this.directorioRemotoGit(),
      rama: this.rama() || "main",
      tecnologia: this.tecnologiaSeleccionada()
    };

    this.http.post<{ success: boolean; message: string; data: any }>("/api/deploy/git", cuerpo).subscribe({
      next: function() {
        componente.desplegando.set(false);
        componente.mensajeExito.set(componente.translate.instant("nuevoDespliegue.exito.registrado"));
        setTimeout(function() {
          componente.router.navigate(["/app/dashboard"]);
        }, 1500);
      },
      error: function(error) {
        componente.desplegando.set(false);
        const detalle = error?.error?.message ?? componente.translate.instant("nuevoDespliegue.errores.noRegistrado");
        componente.mensajeError.set(detalle);
      }
    });
  }

  private lanzarDespliegueZip(): void {
    const archivo = this.archivoZipSeleccionado();
    if (archivo === null) {
      this.mensajeError.set(this.translate.instant("nuevoDespliegue.errores.zipRequerido"));
      return;
    }
    if (!this.directorioRemotoZip().trim()) {
      this.mensajeError.set(this.translate.instant("nuevoDespliegue.errores.directorioRequerido"));
      return;
    }

    this.desplegando.set(true);
    this.progresoSubida.set(1);
    const componente = this;

    const datosFormulario = new FormData();
    datosFormulario.append("servidorId", this.servidorDestinoId());
    datosFormulario.append("directorio", this.directorioRemotoZip());
    datosFormulario.append("tecnologia", this.tecnologiaSeleccionada());
    datosFormulario.append("archivo", archivo);

    this.http.post<{ success: boolean; message: string; data: any }>("/api/deploy/zip", datosFormulario, {
      reportProgress: true,
      observe: "events"
    }).subscribe({
      next: function(evento) {
        if (evento.type === HttpEventType.UploadProgress && evento.total) {
          const porcentaje = Math.round((evento.loaded / evento.total) * 100);
          componente.progresoSubida.set(porcentaje);
        }
        if (evento.type === HttpEventType.Response) {
          componente.desplegando.set(false);
          componente.progresoSubida.set(100);
          componente.mensajeExito.set(componente.translate.instant("nuevoDespliegue.exito.zipDesplegado"));
          setTimeout(function() {
            componente.router.navigate(["/app/dashboard"]);
          }, 2000);
        }
      },
      error: function(error) {
        componente.desplegando.set(false);
        componente.progresoSubida.set(0);
        const detalle = error?.error?.message ?? componente.translate.instant("nuevoDespliegue.errores.zipFallido");
        componente.mensajeError.set(detalle);
      }
    });
  }

  cancelar(): void {
    this.router.navigate(["/app/dashboard"]);
  }
}
