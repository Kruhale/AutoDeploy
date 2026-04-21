import { Component, signal } from '@angular/core';
import { TarjetaEstadistica } from '../../components/shared/tarjeta-estadistica/tarjeta-estadistica';
import { MigasPan } from '../../components/shared/migas-pan/migas-pan';

interface AplicacionHospedada {
  icono: string;
  textoIcono: string;
  colorIcono: 'amarillo' | 'cyan' | 'teal';
  nombre: string;
  meta: string;
  version: string;
}

interface DatosServidor {
  nombre: string;
  estado: 'online' | 'offline' | 'warning';
  ip: string;
  ubicacion: string;
  sistemaOperativo: string;
  cargaCpu: number;
  ramUsada: number;
  ramTotal: number;
  anchoBanda: number;
  ultimoBackup: string;
  tiempoActivo: string;
}

@Component({
  selector: 'app-gestion-servidor',
  imports: [TarjetaEstadistica, MigasPan],
  templateUrl: './gestion-servidor.html',
  styleUrl: './gestion-servidor.scss'
})
export class GestionServidor {
  servidor = signal<DatosServidor | null>(null);
  listaDeAplicaciones = signal<AplicacionHospedada[]>([]);
}
