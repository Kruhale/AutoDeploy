import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";

@Component({
  selector: "app-manifiesto-precios",
  imports: [RouterLink, TranslateModule],
  templateUrl: "./manifiesto-precios.html",
})
export class ManifiestoPrecios {}
