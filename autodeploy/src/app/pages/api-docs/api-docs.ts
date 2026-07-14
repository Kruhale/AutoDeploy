import { Component } from "@angular/core";
import { TranslateModule } from "@ngx-translate/core";

@Component({
  selector: "app-api-docs",
  imports: [TranslateModule],
  templateUrl: "./api-docs.html",
})
export class ApiDocs {
  abrirSwagger(): void {
    const ventanaSwagger = window.open("/swagger-ui.html", "_blank", "noopener");
    if (ventanaSwagger !== null) {
      ventanaSwagger.opener = null;
    }
  }
}
