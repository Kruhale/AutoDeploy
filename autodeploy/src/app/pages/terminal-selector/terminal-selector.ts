import { Component, signal, OnInit } from "@angular/core";
import { RouterLink } from "@angular/router";
import { ServidorService, ServidorRemoto } from "../../services/servidor.service";

@Component({
  selector: "app-terminal-selector",
  imports: [RouterLink],
  templateUrl: "./terminal-selector.html",
  styleUrl: "./terminal-selector.scss"
})
export class TerminalSelector implements OnInit {
  listaDeServidores = signal<ServidorRemoto[]>([]);

  constructor(private servidorService: ServidorService) {}

  ngOnInit(): void {
    const componente = this;

    this.servidorService.listar().subscribe({
      next: function(servidores: ServidorRemoto[]) {
        componente.listaDeServidores.set(servidores);
      }
    });
  }
}
