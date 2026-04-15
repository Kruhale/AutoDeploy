import { Component, signal } from '@angular/core';
import { MigasPan } from '../../components/shared/migas-pan/migas-pan';

interface OpcionTecnologia {
  icono: string;
  etiquetaTexto: string;
  nombre: string;
  descripcion: string;
}

@Component({
  selector: 'app-nuevo-despliegue',
  imports: [MigasPan],
  templateUrl: './nuevo-despliegue.html',
  styleUrl: './nuevo-despliegue.scss'
})
export class NuevoDespliegue {
  tecnologiaSeleccionada = signal<string>('Docker Compose');
  origenCodigo = signal<'git' | 'zip'>('git');
  sslActivo = signal(true);

  opcionesDeTecnologia = signal<OpcionTecnologia[]>([
    { icono: 'fa-solid fa-gear', etiquetaTexto: '', nombre: 'Docker Compose', descripcion: 'Multi-container stack' },
    { icono: 'fa-solid fa-cube', etiquetaTexto: '', nombre: 'DDEV', descripcion: 'Local to production' },
    { icono: '', etiquetaTexto: 'JS', nombre: 'Node.js', descripcion: 'Runtime Javascript V8' },
    { icono: '', etiquetaTexto: 'PHP', nombre: 'PHP', descripcion: 'FPM & Apache/Nginx' },
  ]);

  seleccionarTecnologia(nombre: string): void {
    this.tecnologiaSeleccionada.set(nombre);
  }

  cambiarOrigenCodigo(origen: 'git' | 'zip'): void {
    this.origenCodigo.set(origen);
  }

  alternarSsl(): void {
    this.sslActivo.update(function(estadoActualDelSsl) {
      return !estadoActualDelSsl;
    });
  }
}
