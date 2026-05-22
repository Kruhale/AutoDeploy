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
      // 401 = no autenticado (token invalido o ausente) -> sesion expirada
      // 403 = autenticado pero sin permisos para ESTE recurso (ej. endpoint
      // que requiere ADMIN). No es sesion expirada, asi que dejamos que el
      // componente lo maneje sin tirar al usuario al login.
      const tokenInvalido = errorRecibido.status === 401;
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
