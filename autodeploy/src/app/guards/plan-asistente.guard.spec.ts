import { TestBed } from "@angular/core/testing";
import { Router, UrlTree } from "@angular/router";
import { signal } from "@angular/core";
import { planAsistenteGuard } from "./plan-asistente.guard";
import { UsuarioService } from "../services/usuario.service";

describe("planAsistenteGuard", function() {
  let enrutadorMock: jasmine.SpyObj<Router>;
  let usuarioServiceMock: { plan: ReturnType<typeof signal> };

  beforeEach(function() {
    enrutadorMock = jasmine.createSpyObj<Router>("Router", ["createUrlTree"]);
    enrutadorMock.createUrlTree.and.returnValue({} as UrlTree);

    usuarioServiceMock = { plan: signal<string>("free") };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: enrutadorMock },
        { provide: UsuarioService, useValue: usuarioServiceMock }
      ]
    });
  });

  it("debe permitir acceso si el plan es pro", function() {
    usuarioServiceMock.plan.set("pro");

    const resultado = TestBed.runInInjectionContext(function() {
      return planAsistenteGuard({} as any, {} as any);
    });

    expect(resultado).toBe(true);
    expect(enrutadorMock.createUrlTree).not.toHaveBeenCalled();
  });

  it("debe permitir acceso si el plan es business", function() {
    usuarioServiceMock.plan.set("business");

    const resultado = TestBed.runInInjectionContext(function() {
      return planAsistenteGuard({} as any, {} as any);
    });

    expect(resultado).toBe(true);
  });

  it("debe redirigir a /app/billing si el plan es free", function() {
    usuarioServiceMock.plan.set("free");

    TestBed.runInInjectionContext(function() {
      return planAsistenteGuard({} as any, {} as any);
    });

    expect(enrutadorMock.createUrlTree).toHaveBeenCalledOnceWith(["/app/billing"]);
  });
});
