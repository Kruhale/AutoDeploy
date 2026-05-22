import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { TranslateModule } from "@ngx-translate/core";
import { signal } from "@angular/core";
import { PanelMetricasServidor } from "./panel-metricas-servidor";
import { MetricasServidorService, MetricaServidor } from "../../services/metricas-servidor.service";

describe("PanelMetricasServidor", function() {
  let component: PanelMetricasServidor;
  let fixture: ComponentFixture<PanelMetricasServidor>;
  let metricasFake: any;

  function metricaDemo(parcial: Partial<MetricaServidor> = {}): MetricaServidor {
    return {
      id: "m-1",
      servidorId: "srv-1",
      cpuPorcentaje: 30,
      ramUsadaMb: 2048,
      ramTotalMb: 4096,
      discoUsadoPorcentaje: 40,
      discoUsadoGb: 20,
      discoTotalGb: 50,
      cargaPromedio: 0.5,
      tiempoEncendidoSegundos: 3600,
      webDesplegadas: [],
      containersDocker: [],
      sesionActiva: true,
      fechaMedicion: "2026-05-22T12:00:00",
      ...parcial
    };
  }

  beforeEach(async function() {
    metricasFake = {
      metricasPorServidor: signal<Map<string, MetricaServidor>>(new Map()),
      cargarUltimaMetrica: jasmine.createSpy("cargarUltimaMetrica").and.returnValue(Promise.resolve(null)),
      conectarTiempoReal: jasmine.createSpy("conectarTiempoReal"),
      desconectar: jasmine.createSpy("desconectar")
    };

    await TestBed.configureTestingModule({
      imports: [PanelMetricasServidor, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MetricasServidorService, useValue: metricasFake }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PanelMetricasServidor);
    component = fixture.componentInstance;
    component.servidorId = "srv-1";
    component.nombreServidor = "Mi VPS";
  });

  it("debe crear el componente", function() {
    expect(component).toBeTruthy();
  });

  it("ngOnInit con servidorId valido pide ultima metrica y conecta tiempo real", function() {
    component.ngOnInit();

    expect(metricasFake.cargarUltimaMetrica).toHaveBeenCalledWith("srv-1");
    expect(metricasFake.conectarTiempoReal).toHaveBeenCalled();
  });

  it("ngOnInit con servidorId vacio no llama al servicio", function() {
    component.servidorId = "";
    component.ngOnInit();

    expect(metricasFake.cargarUltimaMetrica).not.toHaveBeenCalled();
    expect(metricasFake.conectarTiempoReal).not.toHaveBeenCalled();
  });

  it("metricaActual: null cuando no hay metrica en el mapa", function() {
    expect(component.metricaActual()).toBeNull();
    expect(component.estaEsperandoDatos()).toBeTrue();
  });

  it("metricaActual: devuelve la metrica correcta cuando esta cacheada", function() {
    const metrica = metricaDemo();
    const mapa = new Map<string, MetricaServidor>();
    mapa.set("srv-1", metrica);
    metricasFake.metricasPorServidor.set(mapa);

    expect(component.metricaActual()).toEqual(metrica);
    expect(component.estaEsperandoDatos()).toBeFalse();
  });

  it("porcentajeRam: 0 si no hay metrica", function() {
    expect(component.porcentajeRam()).toBe(0);
  });

  it("porcentajeRam: 0 si ramTotalMb es 0", function() {
    const mapa = new Map<string, MetricaServidor>();
    mapa.set("srv-1", metricaDemo({ ramUsadaMb: 100, ramTotalMb: 0 }));
    metricasFake.metricasPorServidor.set(mapa);

    expect(component.porcentajeRam()).toBe(0);
  });

  it("porcentajeRam: calcula porcentaje redondeado correctamente", function() {
    const mapa = new Map<string, MetricaServidor>();
    mapa.set("srv-1", metricaDemo({ ramUsadaMb: 1024, ramTotalMb: 4096 }));
    metricasFake.metricasPorServidor.set(mapa);

    expect(component.porcentajeRam()).toBe(25);
  });

  it("tiempoEncendidoTexto: cadena vacia si no hay metrica", function() {
    expect(component.tiempoEncendidoTexto()).toBe("");
  });

  it("tiempoEncendidoTexto: formato dias y horas cuando hay dias", function() {
    const mapa = new Map<string, MetricaServidor>();
    mapa.set("srv-1", metricaDemo({ tiempoEncendidoSegundos: 90000 }));
    metricasFake.metricasPorServidor.set(mapa);

    expect(component.tiempoEncendidoTexto()).toBe("1d 1h");
  });

  it("tiempoEncendidoTexto: formato horas y minutos cuando no hay dias", function() {
    const mapa = new Map<string, MetricaServidor>();
    mapa.set("srv-1", metricaDemo({ tiempoEncendidoSegundos: 7320 }));
    metricasFake.metricasPorServidor.set(mapa);

    expect(component.tiempoEncendidoTexto()).toBe("2h 2m");
  });

  it("tiempoEncendidoTexto: solo minutos cuando es menor de una hora", function() {
    const mapa = new Map<string, MetricaServidor>();
    mapa.set("srv-1", metricaDemo({ tiempoEncendidoSegundos: 300 }));
    metricasFake.metricasPorServidor.set(mapa);

    expect(component.tiempoEncendidoTexto()).toBe("5m");
  });

  it("obtenerClaseColorBarra: critico si porcentaje >= 85", function() {
    expect(component.obtenerClaseColorBarra(85)).toBe("barra-progreso--critico");
    expect(component.obtenerClaseColorBarra(99)).toBe("barra-progreso--critico");
  });

  it("obtenerClaseColorBarra: alerta si porcentaje >= 65 y < 85", function() {
    expect(component.obtenerClaseColorBarra(65)).toBe("barra-progreso--alerta");
    expect(component.obtenerClaseColorBarra(80)).toBe("barra-progreso--alerta");
  });

  it("obtenerClaseColorBarra: normal por defecto", function() {
    expect(component.obtenerClaseColorBarra(0)).toBe("barra-progreso--normal");
    expect(component.obtenerClaseColorBarra(40)).toBe("barra-progreso--normal");
  });

  it("ngOnDestroy: no falla al invocarse", function() {
    expect(function() { component.ngOnDestroy(); }).not.toThrow();
  });
});
