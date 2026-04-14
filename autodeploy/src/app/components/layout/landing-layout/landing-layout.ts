import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../header/header';
import { Footer } from '../footer/footer';

@Component({
  selector: 'app-landing-layout',
  imports: [RouterOutlet, Header, Footer],
  templateUrl: './landing-layout.html',
  styleUrl: './landing-layout.scss'
})
export class LandingLayout {}
