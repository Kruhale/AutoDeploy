import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { CookiesService } from "../../services/cookies.service";

@Component({
  selector: "app-banner-cookies",
  imports: [RouterLink],
  templateUrl: "./banner-cookies.html",
})
export class BannerCookies {
  constructor(public cookiesService: CookiesService) {}
}
