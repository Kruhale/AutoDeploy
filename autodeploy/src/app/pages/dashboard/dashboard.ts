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
  colorIcono: 'verde' | 'rojo' | 'azul' | 'morado';
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
  listaDeServidores = signal<Servidor[]>([
    {
      id: 'primary-vps-ny',
      nombre: 'Primary VPS - NY',
      ip: '192.168.1.10',
      cargaCpu: 12,
      usoRam: '4.2 / 8 GB',
      estado: 'verde',
      colorBarra: 'info',
      iconos: ['fa-solid fa-database', 'fa-solid fa-file-code', 'fa-solid fa-bolt'],
    },
    {
      id: 'backup-node-sf',
      nombre: 'Backup Node - SF',
      ip: '10.0.0.45',
      cargaCpu: 45,
      usoRam: '8.1 / 16 GB',
      estado: 'verde',
      colorBarra: 'info',
      iconos: ['fa-solid fa-code-branch', 'fa-regular fa-face-smile'],
    },
    {
      id: 'staging-lon',
      nombre: 'Staging Server - LON',
      ip: '172.16.0.8',
      cargaCpu: 8,
      usoRam: '1.2 / 4 GB',
      estado: 'naranja',
      colorBarra: 'exito',
      iconos: ['fa-regular fa-circle-check'],
    },
  ]);

  listaDeSitios = signal<SitioWeb[]>([
    { nombre: 'AutoDeploy App', icono: 'fa-solid fa-bolt', colorIcono: 'cyan', dominio: 'app.autodeploy.io', estado: 'operativo', textoEstado: 'Operational', servidor: 'Primary VPS - NY' },
    { nombre: 'Starlight SaaS', icono: 'fa-solid fa-star', colorIcono: 'amarillo', dominio: 'starlight.com', estado: 'operativo', textoEstado: 'Operational', servidor: 'Backup Node - SF' },
    { nombre: 'Beta Dashboard', icono: 'fa-solid fa-cube', colorIcono: 'rojo', dominio: 'beta.autodeploy.io', estado: 'error', textoEstado: 'Error 502', servidor: 'Staging Server - LON' },
    { nombre: 'Static Web', icono: 'fa-solid fa-globe', colorIcono: 'verde', dominio: 'docs.myservice.net', estado: 'desplegando', textoEstado: 'Deploying', servidor: 'Primary VPS - NY' },
  ]);

  listaDeActividad = signal<Actividad[]>([
    { icono: 'fa-solid fa-rocket', colorIcono: 'verde', texto: 'AutoDeploy App deployed', detalle: 'via Webhook Hook' },
    { icono: 'fa-solid fa-triangle-exclamation', colorIcono: 'rojo', texto: 'Build Failed: Beta Dashboard', detalle: 'Error in login' },
    { icono: 'fa-solid fa-server', colorIcono: 'azul', texto: 'New Server Connected', detalle: '172.16.0.8' },
    { icono: 'fa-solid fa-user', colorIcono: 'morado', texto: 'User Login', detalle: '6 hours ago from San Francisco' },
  ]);

  alturasDelGrafico = [30, 45, 35, 60, 50, 80, 95];
}
