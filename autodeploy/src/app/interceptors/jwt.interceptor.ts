import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { inject, Injector } from "@angular/core";
import { Router } from "@angular/router";
import { catchError, throwError } from "rxjs";
import { AuthService } from "../services/auth.service";
import { UsuarioService } from "../services/usuario.service";
import { ServidorService } from "../services/servidor.service";
import { ActividadService } from "../services/actividad.service";
import { NotificacionService } from "../services/notificacion.service";
import { AsistenteIaService } from "../services/asistente-ia.service";

const RUTAS_PUBLICAS = ["/api/usuarios/login", "/api/usuarios/registro", "/api/estado", "/i18n/"];

export const jwtInterceptor: HttpInterceptorFn = (peticion, siguiente) => {
  const enrutador = inject(Router);
  // Injector perezoso: los servicios solo se construyen si de verdad llega un 401.
  const inyector = inject(Injector);

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
        // Limpieza completa: antes solo se borraba parte del sessionStorage y
        // los signals seguian mostrando nombre/avatar/datos del usuario caducado.
        inyector.get(UsuarioService).limpiar();
        inyector.get(AuthService).logout();
        inyector.get(ServidorService).limpiar();
        inyector.get(ActividadService).limpiar();
        inyector.get(NotificacionService).limpiar();
        inyector.get(AsistenteIaService).limpiar();
        enrutador.navigate(["/login"], { queryParams: { sesionExpirada: true } });
      }
      return throwError(function() { return errorRecibido; });
    })
  );
};
