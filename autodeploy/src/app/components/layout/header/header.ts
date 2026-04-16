import { Component, signal } from "@angular/core";
import { RouterLink } from "@angular/router";

@Component({
  selector: "app-header",
  imports: [RouterLink],
  templateUrl: "./header.html",
  styleUrl: "./header.scss",
})
export class Header {
  logotipoVisible = signal(false);

  mostrarLogotipo(): void {
    this.logotipoVisible.set(true);
  }
}
