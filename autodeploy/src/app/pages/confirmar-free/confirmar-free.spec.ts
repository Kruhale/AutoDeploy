import { ComponentFixture, TestBed } from "@angular/core/testing";
import { HttpClientTestingModule } from "@angular/common/http/testing";
import { Router } from "@angular/router";
import { RouterTestingModule } from "@angular/router/testing";
import { TranslateModule } from "@ngx-translate/core";
import { ConfirmarFree } from "./confirmar-free";
import { AuthService } from "../../services/auth.service";
import { UsuarioService } from "../../services/usuario.service";

describe("ConfirmarFree", function() {
  let fixture: ComponentFixture<ConfirmarFree>;
  let componente: ConfirmarFree;
  let authService: AuthService;
  let usuarioService: UsuarioService;
  let router: Router;

  beforeEach(async function() {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ConfirmarFree, HttpClientTestingModule, TranslateModule.forRoot(), RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmarFree);
    componente = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    usuarioService = TestBed.inject(UsuarioService);
    router = TestBed.inject(Router);
  });

  afterEach(function() {
    sessionStorage.clear();
  });

  it("debe crear el componente", function() {
    expect(componente).toBeTruthy();
  });

  it("estaLogueado refleja el estado del AuthService", function() {
    authService.estaLogueado.set(true);
    expect(componente.estaLogueado()).toBeTrue();
    authService.estaLogueado.set(false);
    expect(componente.estaLogueado()).toBeFalse();
  });

  it("planActual devuelve el plan del UsuarioService", function() {
    usuarioService.plan.set("pro");
    expect(componente.planActual()).toBe("pro");
  });

  it("planActual devuelve cadena vacía si el plan es falsy", function() {
    usuarioService.plan.set("");
    expect(componente.planActual()).toBe("");
  });

  it("esBajada es true cuando está logueado y tiene plan pro", function() {
    authService.estaLogueado.set(true);
    usuarioService.plan.set("pro");
    expect(componente.esBajada()).toBeTrue();
  });

  it("esBajada es true cuando está logueado y tiene plan business", function() {
    authService.estaLogueado.set(true);
    usuarioService.plan.set("business");
    expect(componente.esBajada()).toBeTrue();
  });

  it("esBajada es false cuando no está logueado", function() {
    authService.estaLogueado.set(false);
    usuarioService.plan.set("pro");
    expect(componente.esBajada()).toBeFalse();
  });

  it("esBajada es false cuando el plan es free", function() {
    authService.estaLogueado.set(true);
    usuarioService.plan.set("free");
    expect(componente.esBajada()).toBeFalse();
  });

  it("confirmar redirige a /register si no está logueado", function() {
    authService.estaLogueado.set(false);
    const espiaNavegar = spyOn(router, "navigate").and.returnValue(Promise.resolve(true));
    componente.confirmar();
    expect(espiaNavegar).toHaveBeenCalledWith(["/register"]);
  });

  it("confirmar redirige al dashboard si está logueado", function() {
    authService.estaLogueado.set(true);
    const espiaNavegar = spyOn(router, "navigate").and.returnValue(Promise.resolve(true));
    componente.confirmar();
    expect(espiaNavegar).toHaveBeenCalledWith(["/app/dashboard"]);
  });

  it("cancelar navega a la home", function() {
    const espiaNavegar = spyOn(router, "navigate").and.returnValue(Promise.resolve(true));
    componente.cancelar();
    expect(espiaNavegar).toHaveBeenCalledWith(["/"]);
  });
});
