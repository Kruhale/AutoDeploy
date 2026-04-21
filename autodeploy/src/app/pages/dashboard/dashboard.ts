import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TarjetaEstadistica } from '../../components/shared/tarjeta-estadistica/tarjeta-estadistica';

interface Servidor {
  id: string;
  nombre: string;
  ip: string;
  cargaCpu: number;
  usoRam: string;
  estado: 'verde' | 'naranja' | 'rojo';
  colorBarra: string;
  iconos: string[];
}

interface SitioWeb {
  nombre: string;
  icono: string;
  colorIcono: 'cyan' | 'amarillo' | 'rojo' | 'verde';
  dominio: string;
  estado: 'operativo' | 'error' | 'desplegando';
  textoEstado: string;
  servidor: string;
}

interface Actividad {
  icono: string;
  colorIcono: 'verde' | 'rojo' | 'azul' | 'teal';
  texto: string;
  detalle: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, TarjetaEstadistica],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard {
  listaDeServidores = signal<Servidor[]>([]);
  listaDeSitios = signal<SitioWeb[]>([]);
  listaDeActividad = signal<Actividad[]>([]);
  alturasDelGrafico: number[] = [];
}
