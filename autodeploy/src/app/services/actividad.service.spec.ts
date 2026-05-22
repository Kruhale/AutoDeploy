import { TestBed, fakeAsync, tick } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting, HttpTestingController } from "@angular/common/http/testing";
import { ActividadService } from "./actividad.service";

describe("ActividadService", function() {
  let servicio: ActividadService;
  let http: HttpTestingController;

  beforeEach(function() {
    TestBed.configureTestingModule({
      providers: [
        ActividadService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    servicio = TestBed.inject(ActividadService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(function() {
    http.verify();
  });

  it("se crea con cache vacia", function() {
    expect(servicio).toBeTruthy();
    expect(servicio.actividadesRecientes()).toEqual([]);
    expect(servicio.cantidadActividades()).toBe(0);
    expect(servicio.sinActividad()).toBeTrue();
  });

  it("obtenerRecientes: extrae data del wrapper ApiResponse", fakeAsync(function() {
    let recibido: any = null;
    servicio.obtenerRecientes().subscribe(actividades => recibido = actividades);

    const req = http.expectOne("/api/actividad");
    expect(req.request.method).toBe("GET");
    req.flush({
      success: true,
      message: "OK",
      data: [{ id: "a-1", tipo: "info", mensaje: "Algo paso", icono: "fa-info", fechaCreacion: "2026-05-22" }]
    });
    tick();

    expect(recibido).toEqual([
      { id: "a-1", tipo: "info", mensaje: "Algo paso", icono: "fa-info", fechaCreacion: "2026-05-22" }
    ]);
  }));
});
