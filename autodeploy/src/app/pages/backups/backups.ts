import { Component, signal, OnInit, OnDestroy } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DatePipe } from "@angular/common";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { ServidorService, ServidorRemoto } from "../../services/servidor.service";

interface BackupApi {
  id: string;
  servidorId: string;
  nombre: string;
  tipo: "auto" | "manual";
  estado: "en_progreso" | "completado" | "fallido";
  tamano: string;
  fechaCreacion: string;
}

@Component({
  selector: "app-backups",
  imports: [DatePipe, TranslateModule],
  templateUrl: "./backups.html",
  styleUrl: "./backups.scss"
})
export class Backups implements OnInit, OnDestroy {
  listaDeBackups = signal<BackupApi[]>([]);
  listaServidores = signal<ServidorRemoto[]>([]);
  servidorSeleccionadoId = signal<string>("");
  backupsAutomaticos = signal(false);
  horaBackupAutomatico = signal<string>("03:00");
  guardandoAutoBackup = signal(false);
  creandoBackup = signal(false);
  cargando = signal(true);
  mensajeError = signal<string>("");
  mensajeExito = signal<string>("");

  private temporizadorRefresco: ReturnType<typeof setInterval> | null = null;

  constructor(
    private http: HttpClient,
    private servidorService: ServidorService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.cargarServidores();
  }

  ngOnDestroy(): void {
    this.detenerRefresco();
  }

  private cargarServidores(): void {
    const componente = this;
    this.servidorService.listar().subscribe({
      next: function (servidores) {
        componente.listaServidores.set(servidores);
        if (servidores.length > 0) {
          componente.servidorSeleccionadoId.set(servidores[0].id);
          componente.cargarBackups(servidores[0].id);
          componente.cargarEstadoAutoBackup(servidores[0].id);
        } else {
          componente.cargando.set(false);
        }
      },
      error: function () {
        componente.cargando.set(false);
      }
    });
  }

  cambiarServidor(idServidor: string): void {
    this.servidorSeleccionadoId.set(idServidor);
    this.cargarBackups(idServidor);
    this.cargarEstadoAutoBackup(idServidor);
  }

  private cargarEstadoAutoBackup(servidorId: string): void {
    const componente = this;
    this.http.get<any>("/api/backups/auto/" + servidorId).subscribe({
      next: function (respuesta: any) {
        const datos = respuesta && respuesta.data ? respuesta.data : { activado: false, hora: "03:00" };
        componente.backupsAutomaticos.set(!!datos.activado);
        componente.horaBackupAutomatico.set(datos.hora || "03:00");
      },
      error: function () {
        componente.backupsAutomaticos.set(false);
      }
    });
  }

  alternarBackupsAutomaticos(): void {
    const servidorId = this.servidorSeleccionadoId();
    if (!servidorId) return;

    const nuevoEstado = !this.backupsAutomaticos();
    this.guardandoAutoBackup.set(true);
    const componente = this;

    this.http
      .put("/api/backups/auto/" + servidorId, {
        activado: nuevoEstado,
        hora: this.horaBackupAutomatico()
      })
      .subscribe({
        next: function () {
          componente.backupsAutomaticos.set(nuevoEstado);
          componente.guardandoAutoBackup.set(false);
          if (nuevoEstado) {
            componente.mensajeExito.set(
              componente.translate.instant("backups.mensajes.cronInstalado", {
                hora: componente.horaBackupAutomatico()
              })
            );
          } else {
            componente.mensajeExito.set(componente.translate.instant("backups.mensajes.autoDeshabilitado"));
          }
          setTimeout(function () {
            componente.mensajeExito.set("");
          }, 4000);
        },
        error: function () {
          componente.guardandoAutoBackup.set(false);
          const claveError = nuevoEstado ? "backups.mensajes.errorCronInstalar" : "backups.mensajes.errorCronEliminar";
          componente.mensajeError.set(componente.translate.instant(claveError));
          setTimeout(function () {
            componente.mensajeError.set("");
          }, 4000);
        }
      });
  }

  private cargarBackups(servidorId: string): void {
    this.cargando.set(true);
    const componente = this;
    this.http.get<any>("/api/backups/servidor/" + servidorId).subscribe({
      next: function (respuesta: any) {
        const backups: BackupApi[] = Array.isArray(respuesta) ? respuesta : respuesta && Array.isArray(respuesta.data) ? respuesta.data : [];
        componente.listaDeBackups.set(backups);
        componente.cargando.set(false);
        const algunoEnProgreso = backups.some(function (b) {
          return b.estado === "en_progreso";
        });
        if (algunoEnProgreso) {
          componente.programarRefresco(servidorId);
        } else {
          componente.detenerRefresco();
        }
      },
      error: function () {
        componente.listaDeBackups.set([]);
        componente.cargando.set(false);
      }
    });
  }

  private programarRefresco(servidorId: string): void {
    if (this.temporizadorRefresco) return;
    const componente = this;
    this.temporizadorRefresco = setInterval(function () {
      componente.cargarBackups(servidorId);
    }, 4000);
  }

  private detenerRefresco(): void {
    if (this.temporizadorRefresco) {
      clearInterval(this.temporizadorRefresco);
      this.temporizadorRefresco = null;
    }
  }

  crearBackup(): void {
    const servidorId = this.servidorSeleccionadoId();
    if (!servidorId) return;

    this.creandoBackup.set(true);
    const componente = this;
    this.http.post("/api/backups", { servidorId: servidorId, tipo: "manual" }).subscribe({
      next: function () {
        componente.creandoBackup.set(false);
        componente.cargarBackups(servidorId);
      },
      error: function () {
        componente.creandoBackup.set(false);
        componente.mensajeError.set(componente.translate.instant("backups.mensajes.errorIniciar"));
        setTimeout(function () {
          componente.mensajeError.set("");
        }, 3000);
      }
    });
  }

  eliminarBackup(idBackup: string): void {
    const componente = this;
    const servidorId = this.servidorSeleccionadoId();
    this.http.delete("/api/backups/" + idBackup).subscribe({
      next: function () {
        componente.cargarBackups(servidorId);
      },
      error: function () {
        componente.mensajeError.set(componente.translate.instant("backups.mensajes.errorEliminar"));
        setTimeout(function () {
          componente.mensajeError.set("");
        }, 3000);
      }
    });
  }

  restaurarBackup(idBackup: string): void {
    const confirmado = window.confirm(this.translate.instant("backups.mensajes.confirmRestaurar"));
    if (!confirmado) return;

    const componente = this;
    const servidorId = this.servidorSeleccionadoId();

    this.http.post("/api/backups/" + idBackup + "/restaurar", {}).subscribe({
      next: function () {
        componente.mensajeExito.set(componente.translate.instant("backups.mensajes.restoreIniciado"));
        setTimeout(function () {
          componente.mensajeExito.set("");
          componente.cargarBackups(servidorId);
        }, 3000);
      },
      error: function (error) {
        const mensajePorDefecto = componente.translate.instant("backups.mensajes.errorRestaurar");
        const detalle = error && error.error && error.error.message ? error.error.message : mensajePorDefecto;
        componente.mensajeError.set(detalle);
        setTimeout(function () {
          componente.mensajeError.set("");
        }, 4000);
      }
    });
  }
}
