import { ComponentFixture, TestBed } from "@angular/core/testing";
import { HttpClientTestingModule, HttpTestingController } from "@angular/common/http/testing";
import { TranslateModule } from "@ngx-translate/core";
import { Estado } from "./estado";

describe("Estado", function() {
  let fixture: ComponentFixture<Estado>;
  let componente: Estado;
  let httpMock: HttpTestingController;

  beforeEach(async function() {
    jasmine.clock().install();
    await TestBed.configureTestingModule({
      imports: [Estado, HttpClientTestingModule, TranslateModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(Estado);
    componente = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(function() {
    httpMock.verify();
    jasmine.clock().uninstall();
  });

  it("debe crear el componente", function() {
    expect(componente).toBeTruthy();
  });

  it("ngOnInit carga el estado y lo pinta en la señal", function() {
    fixture.detectChanges();
    const peticion = httpMock.expectOne("/api/estado");
    expect(peticion.request.method).toBe("GET");

    const fechaTest = "2026-05-22T10:00:00.000Z";
    peticion.flush({
      success: true,
      data: {
        estadoGeneral: "UP",
        actualizadoEn: fechaTest,
        servicios: [{ clave: "api", estado: "UP", descripcion: "ok" }]
      }
    });

    const protegido = componente as unknown as {
      estadoActual: () => { estadoGeneral: string; servicios: unknown[] } | null;
      cargando: () => boolean;
      errorRed: () => boolean;
    };
    expect(protegido.estadoActual()?.estadoGeneral).toBe("UP");
    expect(protegido.cargando()).toBeFalse();
    expect(protegido.errorRed()).toBeFalse();
  });

  it("ngOnInit con error HTTP marca todos los servicios como DOWN", function() {
    fixture.detectChanges();
    const peticion = httpMock.expectOne("/api/estado");
    peticion.error(new ProgressEvent("network"), { status: 500, statusText: "Server Error" });

    const protegido = componente as unknown as {
      estadoActual: () => { estadoGeneral: string; servicios: { clave: string; estado: string }[] } | null;
      errorRed: () => boolean;
      cargando: () => boolean;
    };
    const sistema = protegido.estadoActual();
    expect(sistema?.estadoGeneral).toBe("DOWN");
    expect(sistema?.servicios.length).toBe(6);
    expect(protegido.errorRed()).toBeTrue();
    expect(protegido.cargando()).toBeFalse();
  });

  it("recargarManual dispara una nueva petición GET /api/estado", function() {
    fixture.detectChanges();
    httpMock.expectOne("/api/estado").flush({
      success: true,
      data: { estadoGeneral: "UP", actualizadoEn: "2026-01-01", servicios: [] }
    });

    componente.recargarManual();
    const peticionRecarga = httpMock.expectOne("/api/estado");
    peticionRecarga.flush({
      success: true,
      data: { estadoGeneral: "DEGRADED", actualizadoEn: "2026-01-02", servicios: [] }
    });

    const protegido = componente as unknown as {
      estadoActual: () => { estadoGeneral: string } | null;
    };
    expect(protegido.estadoActual()?.estadoGeneral).toBe("DEGRADED");
  });

  it("temporizador refresca el estado cada 30 segundos", function() {
    fixture.detectChanges();
    httpMock.expectOne("/api/estado").flush({
      success: true,
      data: { estadoGeneral: "UP", actualizadoEn: "2026-01-01", servicios: [] }
    });

    jasmine.clock().tick(30001);
    const segundaPeticion = httpMock.expectOne("/api/estado");
    segundaPeticion.flush({
      success: true,
      data: { estadoGeneral: "UP", actualizadoEn: "2026-01-02", servicios: [] }
    });
    expect(segundaPeticion.request.method).toBe("GET");
  });

  it("ngOnDestroy limpia el temporizador", function() {
    fixture.detectChanges();
    httpMock.expectOne("/api/estado").flush({
      success: true,
      data: { estadoGeneral: "UP", actualizadoEn: "2026-01-01", servicios: [] }
    });

    componente.ngOnDestroy();
    jasmine.clock().tick(60000);
    httpMock.expectNone("/api/estado");
  });

  it("ngOnDestroy no falla si el temporizador es null", function() {
    expect(function() { componente.ngOnDestroy(); }).not.toThrow();
  });

  it("fechaFormateada devuelve guion si no hay estado cargado", function() {
    const protegido = componente as unknown as { fechaFormateada: () => string };
    expect(protegido.fechaFormateada()).toBe("—");
  });

  it("fechaFormateada formatea la fecha cuando hay estado", function() {
    fixture.detectChanges();
    httpMock.expectOne("/api/estado").flush({
      success: true,
      data: {
        estadoGeneral: "UP",
        actualizadoEn: "2026-05-22T10:00:00.000Z",
        servicios: []
      }
    });

    const protegido = componente as unknown as { fechaFormateada: () => string };
    const formateada = protegido.fechaFormateada();
    expect(formateada).not.toBe("—");
    expect(typeof formateada).toBe("string");
  });
});
