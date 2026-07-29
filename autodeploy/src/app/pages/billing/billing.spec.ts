import { ComponentFixture, TestBed } from "@angular/core/testing";
import { HttpClientTestingModule, HttpTestingController } from "@angular/common/http/testing";
import { provideRouter, Router } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import { signal } from "@angular/core";
import { of } from "rxjs";
import { Billing } from "./billing";
import { PlanService } from "../../services/plan.service";
import { ServidorService, ServidorRemoto } from "../../services/servidor.service";

describe("Billing", function() {
  let componente: Billing;
  let fixture: ComponentFixture<Billing>;
  let servidorServiceSpy: jasmine.SpyObj<ServidorService>;
  let planServiceMock: { planActual: ReturnType<typeof signal<"free" | "pro" | "business">> };
  let routerSpy: jasmine.SpyObj<Router>;
  let httpMock: HttpTestingController;

  function servidorFalso(id: string): ServidorRemoto {
    return {
      id,
      nombre: "srv-" + id,
      direccionIp: "1.1.1." + id,
      puertoSsh: 22,
      usuarioSsh: "root",
      estado: "conectado"
    } as ServidorRemoto;
  }

  beforeEach(async function() {
    servidorServiceSpy = jasmine.createSpyObj<ServidorService>("ServidorService", ["listar"]);
    servidorServiceSpy.listar.and.returnValue(of([] as ServidorRemoto[]));

    planServiceMock = {
      planActual: signal<"free" | "pro" | "business">("free")
    };

    routerSpy = jasmine.createSpyObj<Router>("Router", ["navigate"]);

    await TestBed.configureTestingModule({
      imports: [Billing, HttpClientTestingModule, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: ServidorService, useValue: servidorServiceSpy },
        { provide: PlanService, useValue: planServiceMock },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Billing);
    componente = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    httpMock.match(function() { return true; }).forEach(function(peticion) {
      peticion.flush({ success: true, data: [] });
    });
  });

  afterEach(function() {
    httpMock.verify();
  });

  it("debe crear el componente", function() {
    expect(componente).toBeTruthy();
  });

  it("inicia con contadores en cero y sin facturas", function() {
    expect(componente.numeroServidores()).toBe(0);
    expect(componente.numeroDespliegues()).toBe(0);
    expect(componente.numeroDominios()).toBe(0);
    expect(componente.listaDeFacturas()).toEqual([]);
  });

  it("detallePlanActual devuelve el plan free por defecto", function() {
    expect(componente.detallePlanActual().id).toBe("free");
  });

  it("detallePlanActual sigue el plan seleccionado en PlanService", function() {
    planServiceMock.planActual.set("pro");
    expect(componente.detallePlanActual().id).toBe("pro");
    planServiceMock.planActual.set("business");
    expect(componente.detallePlanActual().id).toBe("business");
  });

  it("fechaProximoCobro devuelve el día 1 del siguiente mes", function() {
    const fecha = componente.fechaProximoCobro();
    expect(fecha.getDate()).toBe(1);
    const ahora = new Date();
    const mesEsperado = (ahora.getMonth() + 1) % 12;
    expect(fecha.getMonth()).toBe(mesEsperado);
  });

  it("diasHastaProximoCobro nunca es negativo", function() {
    expect(componente.diasHastaProximoCobro()).toBeGreaterThanOrEqual(0);
  });

  it("resumenUso tiene tres entradas: servers, deployments, customDomains", function() {
    const resumen = componente.resumenUso();
    expect(resumen.length).toBe(3);
    expect(resumen[0].porcentaje).toBeGreaterThanOrEqual(0);
    expect(resumen[2].porcentaje).toBeLessThanOrEqual(100);
  });

  it("resumenUso muestra unlimited cuando el limite es null", function() {
    planServiceMock.planActual.set("business");
    componente.numeroServidores.set(2);
    const resumen = componente.resumenUso();
    expect(resumen[0].valor).toBe("2");
  });

  it("resumenUso muestra valor/limite cuando hay limite numerico", function() {
    planServiceMock.planActual.set("free");
    componente.numeroServidores.set(1);
    const resumen = componente.resumenUso();
    expect(resumen[0].valor).toBe("1/1");
  });

  it("resumenUso maneja correctamente limite cero (no divide entre 0)", function() {
    planServiceMock.planActual.set("free");
    componente.numeroDespliegues.set(0);
    const resumen = componente.resumenUso();
    expect(resumen[1].porcentaje).toBeGreaterThanOrEqual(0);
    expect(isFinite(resumen[1].porcentaje)).toBeTrue();
  });

  it("navegarAPlanes navega a /app/cuenta", function() {
    componente.navegarAPlanes();
    expect(routerSpy.navigate).toHaveBeenCalledWith(["/app/cuenta"]);
  });

  it("agregarMetodoPago activa el mensaje y lo limpia tras 3s", function() {
    jasmine.clock().install();
    try {
      componente.agregarMetodoPago();
      expect(componente.mensajeMetodoPago().length).toBeGreaterThan(0);
      jasmine.clock().tick(3001);
      expect(componente.mensajeMetodoPago()).toBe("");
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it("cargarUsoReal con servidores cuenta los servidores y dispara dominios", function() {
    servidorServiceSpy.listar.and.returnValue(of([servidorFalso("1"), servidorFalso("2")]));

    componente.ngOnInit();

    const peticionDespliegues = httpMock.match("/api/despliegues");
    peticionDespliegues.forEach(function(p) {
      p.flush({ success: true, data: [] });
    });

    const peticionesSubdominios = httpMock.match(function(req) {
      return req.url.startsWith("/api/subdominios/servidor/");
    });
    peticionesSubdominios.forEach(function(p, i) {
      p.flush({ success: true, data: [{ id: "sub-" + i, nombre: "sub-" + i }] });
    });

    expect(componente.numeroServidores()).toBe(2);
    expect(componente.numeroDominios()).toBe(2);
  });

  it("cargarDespliegues filtra solo los del mes en curso", function() {
    servidorServiceSpy.listar.and.returnValue(of([servidorFalso("1")]));
    componente.ngOnInit();

    const peticionesDespliegues = httpMock.match("/api/despliegues");
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    const dentro = new Date(inicioMes.getTime() + 1000).toISOString();
    const fuera = new Date(inicioMes.getTime() - 86400000).toISOString();

    peticionesDespliegues[peticionesDespliegues.length - 1].flush({
      success: true,
      data: [
        { id: "d1", fechaInicio: dentro },
        { id: "d2", fechaInicio: fuera }
      ]
    });

    const subdominios = httpMock.match(function(req) {
      return req.url.startsWith("/api/subdominios/servidor/");
    });
    subdominios.forEach(function(p) {
      p.flush({ success: true, data: [] });
    });

    expect(componente.numeroDespliegues()).toBe(1);
  });

  it("cargarDespliegues pone 0 si la peticion falla", function() {
    servidorServiceSpy.listar.and.returnValue(of([servidorFalso("1")]));
    componente.ngOnInit();

    const peticionesDespliegues = httpMock.match("/api/despliegues");
    peticionesDespliegues[peticionesDespliegues.length - 1].error(new ProgressEvent("error"));

    const subdominios = httpMock.match(function(req) {
      return req.url.startsWith("/api/subdominios/servidor/");
    });
    subdominios.forEach(function(p) {
      p.flush({ success: true, data: [] });
    });

    expect(componente.numeroDespliegues()).toBe(0);
  });

  it("cargarDominios deja el contador a 0 si no hay servidores", function() {
    servidorServiceSpy.listar.and.returnValue(of([] as ServidorRemoto[]));
    componente.ngOnInit();
    const desp = httpMock.match("/api/despliegues");
    desp.forEach(function(p) { p.flush({ success: true, data: [] }); });
    expect(componente.numeroDominios()).toBe(0);
  });

  it("cargarDominios maneja errores HTTP individualmente", function() {
    servidorServiceSpy.listar.and.returnValue(of([servidorFalso("1"), servidorFalso("2")]));
    componente.ngOnInit();
    httpMock.match("/api/despliegues").forEach(function(p) {
      p.flush({ success: true, data: [] });
    });
    const peticionesSubdominios = httpMock.match(function(req) {
      return req.url.startsWith("/api/subdominios/servidor/");
    });
    peticionesSubdominios[0].flush({ success: true, data: [{ id: "s", nombre: "n" }] });
    peticionesSubdominios[1].error(new ProgressEvent("error"));
    expect(componente.numeroDominios()).toBe(1);
  });
});
