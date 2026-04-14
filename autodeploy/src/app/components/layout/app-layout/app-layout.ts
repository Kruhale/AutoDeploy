import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar.component';
import { BarraPieApp } from '../barra-pie-app/barra-pie-app';

@Component({
  selector: 'app-app-layout',
  imports: [RouterOutlet, Sidebar, BarraPieApp],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.scss'
})
export class AppLayout {}
