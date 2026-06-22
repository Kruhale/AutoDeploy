import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { UsuarioService } from "../services/usuario.service";

export const planAsistenteGuard: CanActivateFn = function() {
  const usuarioService = inject(UsuarioService);
  const router = inject(Router);

  const planActual = usuarioService.plan();
  const tieneAccesoAsistente = planActual === "pro" || planActual === "business";

  if (tieneAccesoAsistente) {
    return true;
  }

  return router.createUrlTree(["/app/billing"]);
};
