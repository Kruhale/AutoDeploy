import { Component } from '@angular/core';
import { Footer } from "../../components/layout/footer/footer";
import { Header } from "../../components/layout/header/header";

@Component({
  selector: 'app-home',
  imports: [Footer, Header],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {

}
