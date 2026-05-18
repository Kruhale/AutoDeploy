import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

interface Miga {
  etiqueta: string;
  enlace?: string;
}

@Component({
  selector: 'app-migas-pan',
  imports: [RouterLink, TranslateModule],
  templateUrl: './migas-pan.html',
  styleUrl: './migas-pan.scss'
})
export class MigasPan {
  migas = input.required<Miga[]>();
}
