import { Component, signal } from "@angular/core";
import { MigasPan } from "../../components/shared/migas-pan/migas-pan";

interface Backup {
  id: string;
  fecha: string;
  tamano: string;
  tipo: "auto" | "manual";
  estado: "completed" | "in-progress" | "failed";
}

@Component({
  selector: "app-backups",
  imports: [MigasPan],
  templateUrl: "./backups.html",
  styleUrl: "./backups.scss"
})
export class Backups {
  listaDeBackups = signal<Backup[]>([]);
  backupsAutomaticos = signal(false);
  creandoBackup = signal(false);

  crearBackup(): void {
    this.creandoBackup.set(true);
    const componente = this;

    const nuevoBackup: Backup = {
      id: "bk-" + Date.now(),
      fecha: new Date().toLocaleString(),
      tamano: "—",
      tipo: "manual",
      estado: "in-progress"
    };

    this.listaDeBackups.update(function(listaActual) {
      return [nuevoBackup, ...listaActual];
    });

    setTimeout(function() {
      componente.listaDeBackups.update(function(listaActual) {
        return listaActual.map(function(backup) {
          if (backup.id === nuevoBackup.id) {
            return { ...backup, estado: "completed" as const, tamano: "2.4 GB" };
          }
          return backup;
        });
      });
      componente.creandoBackup.set(false);
    }, 3000);
  }

  restaurarBackup(id: string): void {
    this.listaDeBackups.update(function(listaActual) {
      return listaActual.map(function(backup) {
        if (backup.id === id) {
          return { ...backup, estado: "in-progress" as const };
        }
        return backup;
      });
    });

    const componente = this;
    setTimeout(function() {
      componente.listaDeBackups.update(function(listaActual) {
        return listaActual.map(function(backup) {
          if (backup.id === id) {
            return { ...backup, estado: "completed" as const };
          }
          return backup;
        });
      });
    }, 2000);
  }
}
