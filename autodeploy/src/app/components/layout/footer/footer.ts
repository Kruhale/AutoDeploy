import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import { SelectorIdioma } from "../../shared/selector-idioma/selector-idioma";

@Component({
  selector: "app-footer",
  imports: [RouterLink, TranslateModule, SelectorIdioma],
  templateUrl: "./footer.html",
  styleUrl: "./footer.scss"
})
export class Footer {}
