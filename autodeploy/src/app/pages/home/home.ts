import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { ScrollRevealDirective } from "../../directives/scroll-reveal.directive";

@Component({
  selector: "app-home",
  imports: [RouterLink, ScrollRevealDirective],
  templateUrl: "./home.html",
  styleUrl: "./home.scss",
})
export class Home {}
