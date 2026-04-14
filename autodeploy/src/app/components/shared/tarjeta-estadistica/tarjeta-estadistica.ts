import { Component, input } from '@angular/core';

@Component({
  selector: 'app-tarjeta-estadistica',
  imports: [],
  templateUrl: './tarjeta-estadistica.html',
  styleUrl: './tarjeta-estadistica.scss'
})
export class TarjetaEstadistica {
  etiqueta = input.required<string>();
  valor = input.required<string>();
  icono = input.required<string>();
  subtexto = input<string>('');
  variante = input<'primario' | 'exito' | 'info' | 'morado' | 'cyan' | 'advertencia'>('primario');
  barraProgreso = input<number>(0);
}
