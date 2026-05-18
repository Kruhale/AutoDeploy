import { TestBed } from "@angular/core/testing";
import { AuthService } from "./auth.service";

describe("AuthService", function() {
  let servicio: AuthService;

  beforeEach(function() {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [AuthService] });
  });

  afterEach(function() {
    sessionStorage.clear();
  });

  it("debe crear el servicio", function() {
    servicio = TestBed.inject(AuthService);
    expect(servicio).toBeTruthy();
  });

  it("debe estar deslogueado por defecto cuando no hay usuarioId", function() {
    sessionStorage.removeItem("usuarioId");
    servicio = TestBed.inject(AuthService);
    expect(servicio.estaLogueado()).toBe(false);
  });

  it("debe estar logueado si hay usuarioId en sessionStorage", function() {
    sessionStorage.setItem("usuarioId", "abc123");
    servicio = TestBed.inject(AuthService);
    expect(servicio.estaLogueado()).toBe(true);
  });

  it("login() debe leer sessionStorage y marcar logueado", function() {
    servicio = TestBed.inject(AuthService);
    expect(servicio.estaLogueado()).toBe(false);

    sessionStorage.setItem("usuarioId", "abc123");
    servicio.login();
    expect(servicio.estaLogueado()).toBe(true);
  });

  it("logout() debe marcar deslogueado aunque sessionStorage siga con usuarioId", function() {
    sessionStorage.setItem("usuarioId", "abc123");
    servicio = TestBed.inject(AuthService);
    expect(servicio.estaLogueado()).toBe(true);

    servicio.logout();
    expect(servicio.estaLogueado()).toBe(false);
  });
});
