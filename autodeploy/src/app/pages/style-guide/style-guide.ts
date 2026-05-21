import { Component } from "@angular/core";
import { Captura, GaleriaCapturas } from "../../components/shared/galeria-capturas/galeria-capturas";

@Component({
  selector: "app-style-guide",
  templateUrl: "./style-guide.html",
  styleUrl: "./style-guide.scss",
  imports: [GaleriaCapturas],
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

  // Capturas reales pendientes. Cuando se incorporen a /img/capturas/
  // bastará con descomentar las entradas o cambiar las rutas. Mientras,
  // la galería renderiza su estado vacío para que se aprecie el
  // componente con su mensaje de placeholder.
  capturasDemo: Captura[] = [];
}
