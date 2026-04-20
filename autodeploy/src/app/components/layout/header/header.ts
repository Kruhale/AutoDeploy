import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { AuthService } from "../../../services/auth.service";

@Component({
  selector: "app-header",
  imports: [RouterLink],
  templateUrl: "./header.html",
  styleUrl: "./header.scss",
})
export class Header {
  constructor(public authService: AuthService) {}
}
