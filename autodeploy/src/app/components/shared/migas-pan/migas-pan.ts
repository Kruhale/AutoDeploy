import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Miga {
  etiqueta: string;
  enlace?: string;
}

@Component({
  selector: 'app-migas-pan',
  imports: [RouterLink],
  templateUrl: './migas-pan.html',
  styleUrl: './migas-pan.scss'
})
export class MigasPan {
  migas = input.required<Miga[]>();
}
