import { Component, OnInit, inject } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { IdiomaService } from "./services/idioma.service";

@Component({
  selector: "app-root",
  imports: [RouterOutlet],
  templateUrl: "./app.html",
  styleUrl: "./app.scss"
})
export class App implements OnInit {

  private idiomaService = inject(IdiomaService);

  ngOnInit(): void {
    this.idiomaService.inicializar();
  }
}
