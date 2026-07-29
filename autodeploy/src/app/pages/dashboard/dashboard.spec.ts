import { ComponentFixture, TestBed } from "@angular/core/testing";
import { HttpClientTestingModule, HttpTestingController } from "@angular/common/http/testing";
import { provideRouter } from "@angular/router";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { signal } from "@angular/core";
import { of } from "rxjs";
import { Dashboard } from "./dashboard";
import { ServidorService, ServidorRemoto } from "../../services/servidor.service";
import { MetricasServidorService } from "../../services/metricas-servidor.service";

describe("Dashboard", function() {
  let componente: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  let servidorServiceSpy: jasmine.SpyObj<ServidorService>;
  let metricasServiceMock: { conectarTiempoReal: jasmine.Spy; desconectar: jasmine.Spy; metricasPorServidor: ReturnType<typeof signal> };

  beforeEach(async function() {
    servidorServiceSpy = jasmine.createSpyObj<ServidorService>("ServidorService", ["listar", "cargarYCachear"]);
    const servidoresMock = of([
      { id: "s1", nombre: "Test Demo", direccionIp: "1.2.3.4", puertoSsh: 22, usuarioSsh: "root", estado: "conectado" } as ServidorRemoto,
      { id: "s2", nombre: "Server Down", direccionIp: "9.9.9.9", puertoSsh: 22, usuarioSsh: "root", estado: "desconectado" } as ServidorRemoto
    ]);
    servidorServiceSpy.listar.and.returnValue(servidoresMock);
    servidorServiceSpy.cargarYCachear.and.returnValue(servidoresMock);

    metricasServiceMock = {
      conectarTiempoReal: jasmine.createSpy("conectarTiempoReal"),
      desconectar: jasmine.createSpy("desconectar"),
      cargarUltimaMetrica: jasmine.createSpy("cargarUltimaMetrica").and.returnValue(Promise.resolve(null)),
      obtenerMetrica: jasmine.createSpy("obtenerMetrica").and.returnValue(null),
      metricasPorServidor: signal(new Map())
    } as any;

    await TestBed.configureTestingModule({
      imports: [Dashboard, HttpClientTestingModule, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: ServidorService, useValue: servidorServiceSpy },
        { provide: MetricasServidorService, useValue: metricasServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    componente = fixture.componentInstance;
    fixture.detectChanges();

    const httpTest = TestBed.inject(HttpTestingController);
    httpTest.match(function() { return true; }).forEach(function(peticion) {
      peticion.flush({ success: true, data: [] });
    });
  });

  it("debe crear el componente", function() {
    expect(componente).toBeTruthy();
  });

  it("debe cargar la lista de servidores en ngOnInit", function() {
    expect(servidorServiceSpy.cargarYCachear).toHaveBeenCalled();
    expect(componente.listaDeServidores().length).toBeGreaterThan(0);
  });

  it("debe inicializar la conexión de métricas en tiempo real", function() {
    expect(metricasServiceMock.conectarTiempoReal).toHaveBeenCalled();
  });

  it("contadorServidoresOnline debe contar solo los verdes", function() {
    componente.listaDeServidores.set([
      { id: "a", nombre: "A", ip: "1.1.1.1", estado: "verde" },
      { id: "b", nombre: "B", ip: "2.2.2.2", estado: "verde" },
      { id: "c", nombre: "C", ip: "3.3.3.3", estado: "rojo" }
    ]);
    expect(componente.contadorServidoresOnline()).toBe(2);
  });

  it("contadorServidoresOffline debe contar solo los rojos", function() {
    componente.listaDeServidores.set([
      { id: "a", nombre: "A", ip: "1.1.1.1", estado: "verde" },
      { id: "b", nombre: "B", ip: "2.2.2.2", estado: "rojo" },
      { id: "c", nombre: "C", ip: "3.3.3.3", estado: "rojo" }
    ]);
    expect(componente.contadorServidoresOffline()).toBe(2);
  });

  it("resolverColorIcono devuelve rojo para error o alerta", function() {
    expect(componente.resolverColorIcono("error")).toBe("rojo");
    expect(componente.resolverColorIcono("alerta")).toBe("rojo");
  });

  it("resolverColorIcono devuelve azul para despliegue", function() {
    expect(componente.resolverColorIcono("despliegue")).toBe("azul");
  });

  it("resolverColorIcono devuelve teal para ssh y conexion", function() {
    expect(componente.resolverColorIcono("ssh")).toBe("teal");
    expect(componente.resolverColorIcono("conexion")).toBe("teal");
  });

  it("resolverColorIcono devuelve verde por defecto", function() {
    expect(componente.resolverColorIcono("otro")).toBe("verde");
    expect(componente.resolverColorIcono("")).toBe("verde");
  });

  it("calcularTiempoRelativo devuelve haceUnMomento si <1 minuto", function() {
    const traduccion = TestBed.inject(TranslateService);
    spyOn(traduccion, "instant").and.callFake(function(clave: string) {
      return clave;
    });
    const fechaReciente = new Date().toISOString();
    expect(componente.calcularTiempoRelativo(fechaReciente)).toBe("dashboard.tiempoRelativo.haceUnMomento");
  });

  it("calcularTiempoRelativo devuelve minutos si <60", function() {
    const traduccion = TestBed.inject(TranslateService);
    spyOn(traduccion, "instant").and.callFake(function(clave: string) {
      return clave;
    });
    const fechaHace5Min = new Date(Date.now() - 5 * 60000).toISOString();
    expect(componente.calcularTiempoRelativo(fechaHace5Min)).toBe("dashboard.tiempoRelativo.minutos");
  });

  it("calcularTiempoRelativo devuelve horas si <24h", function() {
    const traduccion = TestBed.inject(TranslateService);
    spyOn(traduccion, "instant").and.callFake(function(clave: string) {
      return clave;
    });
    const fechaHace2Horas = new Date(Date.now() - 2 * 3600000).toISOString();
    expect(componente.calcularTiempoRelativo(fechaHace2Horas)).toBe("dashboard.tiempoRelativo.horas");
  });

  it("calcularTiempoRelativo devuelve dias si >=24h", function() {
    const traduccion = TestBed.inject(TranslateService);
    spyOn(traduccion, "instant").and.callFake(function(clave: string) {
      return clave;
    });
    const fechaHace3Dias = new Date(Date.now() - 3 * 86400000).toISOString();
    expect(componente.calcularTiempoRelativo(fechaHace3Dias)).toBe("dashboard.tiempoRelativo.dias");
  });

  it("ngOnDestroy debe desconectar el servicio de métricas", function() {
    componente.ngOnDestroy();
    expect(metricasServiceMock.desconectar).toHaveBeenCalled();
  });

  it("cargarActividad mapea las actividades de la API a Actividad", function() {
    const httpTest = TestBed.inject(HttpTestingController);
    const traduccion = TestBed.inject(TranslateService);
    spyOn(traduccion, "instant").and.returnValue("hace un momento");

    componente.cargarActividad();
    const peticiones = httpTest.match("/api/actividad");
    const ultima = peticiones[peticiones.length - 1];
    ultima.flush({
      success: true,
      data: [
        { tipo: "error", mensaje: "fallo", icono: "fa-bug", fechaCreacion: new Date().toISOString() },
        { tipo: "despliegue", mensaje: "deploy", icono: "fa-rocket", fechaCreacion: new Date().toISOString() }
      ]
    });

    const actividad = componente.listaDeActividad();
    expect(actividad.length).toBe(2);
    expect(actividad[0].colorIcono).toBe("rojo");
    expect(actividad[1].colorIcono).toBe("azul");
  });

  it("cargarActividad soporta respuesta sin wrapper (array directo)", function() {
    const httpTest = TestBed.inject(HttpTestingController);
    componente.cargarActividad();
    const peticiones = httpTest.match("/api/actividad");
    peticiones[peticiones.length - 1].flush([
      { tipo: "ssh", mensaje: "conectado", icono: "fa-key", fechaCreacion: new Date().toISOString() }
    ]);
    expect(componente.listaDeActividad().length).toBe(1);
  });

  it("cargarDespliegues guarda los despliegues recibidos", function() {
    const httpTest = TestBed.inject(HttpTestingController);
    componente.cargarDespliegues();
    const peticiones = httpTest.match("/api/despliegues");
    peticiones[peticiones.length - 1].flush({
      success: true,
      data: [
        { id: "d1", servidorId: "s1", tipo: "git", estado: "completado", mensaje: "ok", fechaInicio: "2026-01-01" }
      ]
    });
    expect(componente.listaDespliegues().length).toBe(1);
    expect(componente.listaDespliegues()[0].estado).toBe("completado");
  });

  it("cargarSitios procesa subdominios y los mapea a SitioWeb", function() {
    const httpTest = TestBed.inject(HttpTestingController);
    componente.listaDeSitios.set([]);

    componente.cargarServidores();
    const peticionesSubdominios = httpTest.match(function(req) {
      return req.url.startsWith("/api/subdominios/servidor/");
    });
    peticionesSubdominios.forEach(function(peticion, indice) {
      peticion.flush({
        success: true,
        data: [
          { nombre: "web" + indice, tipo: "A", destino: "1.1.1.1", sslActivo: indice === 0 }
        ]
      });
    });

    const sitios = componente.listaDeSitios();
    expect(sitios.length).toBeGreaterThanOrEqual(1);
    expect(sitios[0].colorIcono).toBe("verde");
    expect(sitios[0].textoEstado).toBe("HTTPS");
  });

  it("cargarSitios deja la lista vacía si no hay servidores", function() {
    servidorServiceSpy.cargarYCachear.and.returnValue(of([]));
    componente.cargarServidores();
    expect(componente.listaDeSitios()).toEqual([]);
  });

  it("cargarSitios maneja errores HTTP por subdominio sin romper", function() {
    const httpTest = TestBed.inject(HttpTestingController);
    componente.cargarServidores();
    const peticionesSubdominios = httpTest.match(function(req) {
      return req.url.startsWith("/api/subdominios/servidor/");
    });
    peticionesSubdominios.forEach(function(peticion) {
      peticion.error(new ProgressEvent("error"));
    });
    expect(componente.listaDeSitios()).toEqual([]);
  });
});
