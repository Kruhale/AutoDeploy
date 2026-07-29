import { TestBed } from "@angular/core/testing";
import { Router, UrlTree } from "@angular/router";
import { authGuard } from "./auth.guard";
import { AuthService } from "../services/auth.service";

describe("authGuard", function() {
  let enrutadorMock: jasmine.SpyObj<Router>;
  let authServiceMock: { estaLogueado: jasmine.Spy };

  beforeEach(function() {
    enrutadorMock = jasmine.createSpyObj<Router>("Router", ["createUrlTree"]);
    enrutadorMock.createUrlTree.and.returnValue({} as UrlTree);

    authServiceMock = { estaLogueado: jasmine.createSpy("estaLogueado") };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: enrutadorMock },
        { provide: AuthService, useValue: authServiceMock }
      ]
    });
  });

  it("debe permitir acceso cuando el usuario está logueado", function() {
    authServiceMock.estaLogueado.and.returnValue(true);

    const resultado = TestBed.runInInjectionContext(function() {
      return authGuard({} as any, {} as any);
    });

    expect(resultado).toBe(true);
    expect(enrutadorMock.createUrlTree).not.toHaveBeenCalled();
  });

  it("debe redirigir a /login cuando el usuario NO está logueado", function() {
    authServiceMock.estaLogueado.and.returnValue(false);

    TestBed.runInInjectionContext(function() {
      return authGuard({} as any, {} as any);
    });

    expect(enrutadorMock.createUrlTree).toHaveBeenCalledOnceWith(["/login"]);
  });
});
