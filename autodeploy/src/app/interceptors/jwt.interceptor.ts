import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { catchError, throwError } from "rxjs";

const RUTAS_PUBLICAS = ["/api/usuarios/login", "/api/usuarios/registro", "/api/estado", "/i18n/"];

export const jwtInterceptor: HttpInterceptorFn = (peticion, siguiente) => {
  const enrutador = inject(Router);

  const esRutaPublica = RUTAS_PUBLICAS.some(function(prefijo) {
    return peticion.url.includes(prefijo);
  });

  const tokenGuardado = sessionStorage.getItem("token");
  let peticionConToken = peticion;

  if (tokenGuardado !== null && !esRutaPublica) {
    peticionConToken = peticion.clone({
      setHeaders: {
        Authorization: `Bearer ${tokenGuardado}`
      }
    });
  }

  return siguiente(peticionConToken).pipe(
    catchError(function(errorRecibido: HttpErrorResponse) {
      const tokenInvalido = errorRecibido.status === 401 || errorRecibido.status === 403;
      if (tokenInvalido && !esRutaPublica) {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("usuarioId");
        sessionStorage.removeItem("plan");
        sessionStorage.removeItem("nombre");
        sessionStorage.removeItem("email");
        enrutador.navigate(["/login"], { queryParams: { sesionExpirada: true } });
      }
      return throwError(function() { return errorRecibido; });
    })
  );
};
