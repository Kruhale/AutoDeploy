import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Home } from "./pages/home/home";
import { Header } from "./components/layout/header/header";
import { Footer } from "./components/layout/footer/footer";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Home, Header, Footer],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('autodeploy');
}
