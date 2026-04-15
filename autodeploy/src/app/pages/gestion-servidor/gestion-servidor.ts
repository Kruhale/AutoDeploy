import { Component, signal } from '@angular/core';
import { TarjetaEstadistica } from '../../components/shared/tarjeta-estadistica/tarjeta-estadistica';
import { MigasPan } from '../../components/shared/migas-pan/migas-pan';

interface AplicacionHospedada {
  icono: string;
  textoIcono: string;
  colorIcono: 'amarillo' | 'cyan' | 'morado';
  nombre: string;
  meta: string;
  version: string;
}

@Component({
  selector: 'app-gestion-servidor',
  imports: [TarjetaEstadistica, MigasPan],
  templateUrl: './gestion-servidor.html',
  styleUrl: './gestion-servidor.scss'
})
export class GestionServidor {
  listaDeAplicaciones = signal<AplicacionHospedada[]>([
    { icono: '', textoIcono: 'JS', colorIcono: 'amarillo', nombre: 'main-api-service', meta: 'api.autodeploy.sh · Node.js v18.x', version: 'v1.2.4' },
    { icono: '', textoIcono: 'HTML', colorIcono: 'cyan', nombre: 'client-dashboard', meta: 'app.autodeploy.sh · React / Nginx', version: 'v2.0.1' },
    { icono: 'fa-solid fa-globe', textoIcono: '', colorIcono: 'morado', nombre: 'marketing-site', meta: 'autodeploy.sh · Static / CDN', version: 'v1.0.0' },
  ]);
}
