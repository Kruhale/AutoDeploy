import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import { CookiesService } from "../../services/cookies.service";

@Component({
  selector: "app-banner-cookies",
  imports: [RouterLink, TranslateModule],
  templateUrl: "./banner-cookies.html",
})
export class BannerCookies {
  constructor(public cookiesService: CookiesService) {}
}
