import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideHttpClient, withInterceptors, HttpClient } from "@angular/common/http";
import { provideTranslateService, TranslateLoader } from "@ngx-translate/core";
import { TranslateHttpLoader } from "@ngx-translate/http-loader";

import { routes } from "./app.routes";
import { jwtInterceptor } from "./interceptors/jwt.interceptor";

const idiomaPorDefecto = "es";

export function fabricaCargadorTraducciones(http: HttpClient): TranslateHttpLoader {
  return new TranslateHttpLoader(http, "/i18n/", ".json");
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([jwtInterceptor])),
    provideTranslateService({
      defaultLanguage: idiomaPorDefecto,
      loader: {
        provide: TranslateLoader,
        useFactory: fabricaCargadorTraducciones,
        deps: [HttpClient]
      }
    })
  ]
};
