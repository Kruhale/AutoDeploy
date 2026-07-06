import { Component } from "@angular/core";
import { Captura, GaleriaCapturas } from "../../components/shared/galeria-capturas/galeria-capturas";

@Component({
  selector: "app-style-guide",
  templateUrl: "./style-guide.html",
  styleUrl: "./style-guide.scss",
  imports: [GaleriaCapturas],
})
export class StyleGuide {
  // Servidores de mentira para enseñar como se ven las tarjetas en la guia de estilos
  servidoresDemo = [
    { nombre: "vps-prod-01", ip: "203.0.113.42", estado: "verde", cpu: 24, ram: 58, disco: 42 },
    { nombre: "vps-dev-02", ip: "203.0.113.55", estado: "naranja", cpu: 87, ram: 73, disco: 65 },
    { nombre: "vps-test-03", ip: "203.0.113.71", estado: "rojo", cpu: 0, ram: 0, disco: 0 },
  ];

  // Lista vacia a proposito: asi se ve el placeholder de la galeria sin capturas
  capturasDemo: Captura[] = [];
}
