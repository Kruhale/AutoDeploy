import { Component } from "@angular/core";

@Component({
  selector: "app-style-guide",
  templateUrl: "./style-guide.html",
  styleUrl: "./style-guide.scss",
})
export class StyleGuide {
  // Datos de demostración para las tarjetas de servidor mostradas en la
  // sección de componentes. No conecta con el backend porque esta página
  // sirve sólo como documentación visual.
  servidoresDemo = [
    { nombre: "vps-prod-01", ip: "203.0.113.42", estado: "verde", cpu: 24, ram: 58, disco: 42 },
    { nombre: "vps-dev-02", ip: "203.0.113.55", estado: "naranja", cpu: 87, ram: 73, disco: 65 },
    { nombre: "vps-test-03", ip: "203.0.113.71", estado: "rojo", cpu: 0, ram: 0, disco: 0 },
  ];
}
