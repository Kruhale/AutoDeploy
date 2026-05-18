import { Component } from "@angular/core";
import { TranslateModule } from "@ngx-translate/core";
import { SelectorIdioma } from "../../shared/selector-idioma/selector-idioma";

@Component({
  selector: "app-barra-pie-app",
  imports: [TranslateModule, SelectorIdioma],
  templateUrl: "./barra-pie-app.html",
  styleUrl: "./barra-pie-app.scss"
})
export class BarraPieApp {}
