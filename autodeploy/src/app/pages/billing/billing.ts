import { Component, signal } from "@angular/core";
import { Router } from "@angular/router";
import { MigasPan } from "../../components/shared/migas-pan/migas-pan";

interface Factura {
  id: string;
  fecha: string;
  concepto: string;
  importe: string;
  estado: "paid" | "pending" | "failed";
}

@Component({
  selector: "app-billing",
  imports: [MigasPan],
  templateUrl: "./billing.html",
  styleUrl: "./billing.scss"
})
export class Billing {
  listaDeFacturas = signal<Factura[]>([]);
  mensajeMetodoPago = signal("");

  constructor(private router: Router) {}

  navegarAPlanes(): void {
    this.router.navigate(["/app/cuenta"]);
  }

  agregarMetodoPago(): void {
    this.mensajeMetodoPago.set("Payment method configuration is not yet available");
    const componente = this;
    setTimeout(function() {
      componente.mensajeMetodoPago.set("");
    }, 3000);
  }
}
