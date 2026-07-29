import { TestBed } from "@angular/core/testing";
import { CookiesService } from "./cookies.service";

describe("CookiesService", function() {
  let servicio: CookiesService;

  beforeEach(function() {
    localStorage.clear();
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(CookiesService);
  });

  afterEach(function() {
    localStorage.clear();
  });

  it("se crea correctamente", function() {
    expect(servicio).toBeTruthy();
  });

  it("aceptar: guarda 'aceptadas' en localStorage y marca consentimiento", function() {
    servicio.aceptar();
    expect(localStorage.getItem("cookies")).toBe("aceptadas");
    expect(servicio.consentimientoDado()).toBeTrue();
  });

  it("rechazar: guarda 'rechazadas' en localStorage y marca consentimiento", function() {
    servicio.rechazar();
    expect(localStorage.getItem("cookies")).toBe("rechazadas");
    expect(servicio.consentimientoDado()).toBeTrue();
  });
});
