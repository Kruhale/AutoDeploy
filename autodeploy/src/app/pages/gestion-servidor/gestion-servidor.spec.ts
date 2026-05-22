import { ComponentFixture, TestBed, fakeAsync, tick } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting, HttpTestingController } from "@angular/common/http/testing";
import { provideRouter, ActivatedRoute, convertToParamMap } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import { signal } from "@angular/core";
import { GestionServidor } from "./gestion-servidor";
import { MetricasServidorService, MetricaServidor } from "../../services/metricas-servidor.service";
import { ServidorRemoto } from "../../services/servidor.service";

class MetricasServidorServiceFake {
  metricasPorServidor = signal<Map<string, MetricaServidor>>(new Map());
  cargarUltimaMetrica = jasmine.createSpy("cargarUltimaMetrica");
  conectarTiempoReal = jasmine.createSpy("conectarTiempoReal");
  desconectar = jasmine.createSpy("desconectar");
}

function crearMetrica(parcial: Partial<MetricaServidor>): MetricaServidor {
  return {
    id: parcial.id || "m-1",
    servidorId: parcial.servidorId || "srv-1",
    cpuPorcentaje: parcial.cpuPorcentaje !== undefined ? parcial.cpuPorcentaje : 12.345,
    ramUsadaMb: parcial.ramUsadaMb !== undefined ? parcial.ramUsadaMb : 512,
    ramTotalMb: parcial.ramTotalMb !== undefined ? parcial.ramTotalMb : 1024,
    discoUsadoPorcentaje: parcial.discoUsadoPorcentaje !== undefined ? parcial.discoUsadoPorcentaje : 45,
    discoUsadoGb: parcial.discoUsadoGb !== undefined ? parcial.discoUsadoGb : 20,
    discoTotalGb: parcial.discoTotalGb !== undefined ? parcial.discoTotalGb : 100,
    cargaPromedio: parcial.cargaPromedio !== undefined ? parcial.cargaPromedio : 0.5,
    tiempoEncendidoSegundos: parcial.tiempoEncendidoSegundos !== undefined ? parcial.tiempoEncendidoSegundos : 3600,
    webDesplegadas: parcial.webDesplegadas || [],
    containersDocker: parcial.containersDocker || [],
    sesionActiva: parcial.sesionActiva !== undefined ? parcial.sesionActiva : true,
    fechaMedicion: parcial.fechaMedicion || "2026-05-22T12:00:00"
  };
}

function crearServidor(parcial: Partial<ServidorRemoto>): ServidorRemoto {
  return {
    id: parcial.id || "srv-1",
    nombre: parcial.nombre || "Servidor de prueba",
    direccionIp: parcial.direccionIp || "10.0.0.1",
    puertoSsh: parcial.puertoSsh !== undefined ? parcial.puertoSsh : 2222,
    usuarioSsh: parcial.usuarioSsh || "ubuntu",
    metodoAutenticacion: parcial.metodoAutenticacion || "password",
    estado: parcial.estado || "conectado",
    fechaCreacion: parcial.fechaCreacion || "2026-05-22T00:00:00"
  };
}

function configurarRutaConId(idServidor: string | null) {
  return {
    snapshot: {
      paramMap: convertToParamMap(idServidor !== null ? { id: idServidor } : {})
    }
  } as unknown as ActivatedRoute;
}

describe("GestionServidor", function() {
  let component: GestionServidor;
  let fixture: ComponentFixture<GestionServidor>;
  let httpMock: HttpTestingController;
  let metricasFake: MetricasServidorServiceFake;

  function montarConRuta(idServidor: string | null) {
    TestBed.configureTestingModule({
      imports: [GestionServidor, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MetricasServidorService, useValue: metricasFake },
        { provide: ActivatedRoute, useValue: configurarRutaConId(idServidor) }
      ]
    });
    fixture = TestBed.createComponent(GestionServidor);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  }

  beforeEach(function() {
    metricasFake = new MetricasServidorServiceFake();
  });

  afterEach(function() {
    httpMock.verify();
  });

  it("debe crear el componente cuando no hay id en la ruta", function() {
    montarConRuta(null);
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.servidorId()).toBe("");
    expect(metricasFake.cargarUltimaMetrica).not.toHaveBeenCalled();
    expect(metricasFake.conectarTiempoReal).not.toHaveBeenCalled();
  });

  it("metricaActual: devuelve null cuando servidorId vacio", function() {
    montarConRuta(null);
    fixture.detectChanges();
    expect(component.metricaActual()).toBeNull();
    expect(component.cpuValor()).toBe("—");
    expect(component.ramValor()).toBe("—");
    expect(component.discoValor()).toBe("—");
    expect(component.porcentajeRam()).toBe(0);
    expect(component.sinMetricasTodavia()).toBeTrue();
  });

  it("metricaActual: devuelve null si el id no esta en el mapa", function() {
    montarConRuta(null);
    fixture.detectChanges();
    component.servidorId.set("srv-x");
    metricasFake.metricasPorServidor.set(new Map());

    expect(component.metricaActual()).toBeNull();
    expect(component.sinMetricasTodavia()).toBeTrue();
  });

  it("metricaActual: devuelve la metrica cuando esta en el mapa", function() {
    montarConRuta(null);
    fixture.detectChanges();
    const metrica = crearMetrica({ servidorId: "srv-z", cpuPorcentaje: 50.5, ramUsadaMb: 256, ramTotalMb: 1024, discoUsadoPorcentaje: 75 });
    const mapa = new Map<string, MetricaServidor>();
    mapa.set("srv-z", metrica);

    component.servidorId.set("srv-z");
    metricasFake.metricasPorServidor.set(mapa);

    expect(component.metricaActual()).toBe(metrica);
    expect(component.cpuValor()).toBe("50.5%");
    expect(component.porcentajeRam()).toBe(25);
    expect(component.ramValor()).toBe("25%");
    expect(component.discoValor()).toBe("75%");
    expect(component.sinMetricasTodavia()).toBeFalse();
  });

  it("porcentajeRam: devuelve 0 si ramTotalMb es 0", function() {
    montarConRuta(null);
    fixture.detectChanges();
    const metrica = crearMetrica({ servidorId: "srv-cero", ramTotalMb: 0, ramUsadaMb: 0 });
    const mapa = new Map<string, MetricaServidor>();
    mapa.set("srv-cero", metrica);
    component.servidorId.set("srv-cero");
    metricasFake.metricasPorServidor.set(mapa);

    expect(component.porcentajeRam()).toBe(0);
  });

  it("ngOnInit con id valido: carga servidor, salud, subdominios, aplicaciones y conecta metricas", function() {
    montarConRuta("srv-1");
    fixture.detectChanges();

    const peticionServidor = httpMock.expectOne("/api/servidores/srv-1");
    expect(peticionServidor.request.method).toBe("GET");
    peticionServidor.flush({
      success: true,
      message: "OK",
      data: crearServidor({ id: "srv-1", nombre: "Mi VPS", direccionIp: "9.9.9.9", usuarioSsh: "root", puertoSsh: 22, estado: "conectado" })
    });

    expect(component.servidorId()).toBe("srv-1");
    expect(component.servidorNombre()).toBe("Mi VPS");
    expect(component.servidorIp()).toBe("9.9.9.9");
    expect(component.servidorUsuario()).toBe("root");
    expect(component.servidorPuerto()).toBe(22);
    expect(component.servidorEstado()).toBe("online");

    const peticionSalud = httpMock.expectOne("/api/health/srv-1");
    peticionSalud.flush({
      success: true,
      message: "OK",
      data: [
        { estado: "online", tiempoRespuestaMs: 30, fechaComprobacion: "2026-05-22T12:00:00" },
        { estado: "online", tiempoRespuestaMs: 31, fechaComprobacion: "2026-05-22T12:01:00" }
      ]
    });
    expect(component.estadoSalud()).not.toBeNull();
    expect(component.historialSalud().length).toBe(2);

    const peticionSubdominios = httpMock.expectOne("/api/subdominios/servidor/srv-1");
    peticionSubdominios.flush({
      success: true,
      message: "OK",
      data: [{ id: "sub-1", nombre: "api.foo.com", tipo: "A", destino: "1.2.3.4", sslActivo: true }]
    });
    expect(component.listaSubdominios().length).toBe(1);

    const peticionDespliegues = httpMock.expectOne("/api/despliegues/servidor/srv-1");
    peticionDespliegues.flush({
      success: true,
      message: "OK",
      data: [
        { id: "d-1", servidorId: "srv-1", tipo: "node", url: "https://app.com", estado: "completado", mensaje: "", fechaInicio: "2026-05-22T11:00:00" },
        { id: "d-2", servidorId: "srv-1", tipo: "docker", url: "", estado: "fallido", mensaje: "", fechaInicio: "2026-05-22T11:00:00" },
        { id: "d-3", servidorId: "srv-1", tipo: "spring", url: "", estado: "en-proceso", mensaje: "", fechaInicio: "" }
      ]
    });
    const apps = component.listaDeAplicaciones();
    expect(apps.length).toBe(3);
    expect(apps[0].colorIcono).toBe("amarillo");
    expect(apps[0].nombre).toBe("https://app.com");
    expect(apps[1].colorIcono).toBe("teal");
    expect(apps[1].nombre).toBe("docker");
    expect(apps[2].colorIcono).toBe("cyan");
    expect(apps[2].version).toBe("—");

    expect(metricasFake.cargarUltimaMetrica).toHaveBeenCalledWith("srv-1");
    expect(metricasFake.conectarTiempoReal).toHaveBeenCalled();
  });

  it("ngOnInit: estado distinto a conectado se mapea a offline", function() {
    montarConRuta("srv-2");
    fixture.detectChanges();

    const peticionServidor = httpMock.expectOne("/api/servidores/srv-2");
    peticionServidor.flush({
      success: true,
      message: "OK",
      data: crearServidor({ id: "srv-2", estado: "desconectado" })
    });

    expect(component.servidorEstado()).toBe("offline");

    httpMock.expectOne("/api/health/srv-2").flush({ success: true, message: "OK", data: [] });
    httpMock.expectOne("/api/subdominios/servidor/srv-2").flush({ success: true, message: "OK", data: [] });
    httpMock.expectOne("/api/despliegues/servidor/srv-2").flush({ success: true, message: "OK", data: [] });

    expect(component.estadoSalud()).toBeNull();
    expect(component.historialSalud()).toEqual([]);
    expect(component.listaSubdominios()).toEqual([]);
    expect(component.listaDeAplicaciones()).toEqual([]);
  });

  it("cargarAplicaciones: en error vacia la lista", function() {
    montarConRuta(null);
    fixture.detectChanges();

    component.cargarAplicaciones("srv-x");
    const peticion = httpMock.expectOne("/api/despliegues/servidor/srv-x");
    peticion.error(new ProgressEvent("network"), { status: 500, statusText: "Server Error" });

    expect(component.listaDeAplicaciones()).toEqual([]);
  });

  it("cargarAplicaciones: acepta respuesta como array plano", function() {
    montarConRuta(null);
    fixture.detectChanges();

    component.cargarAplicaciones("srv-array");
    const peticion = httpMock.expectOne("/api/despliegues/servidor/srv-array");
    peticion.flush([
      { id: "d-1", servidorId: "srv-array", tipo: "node", url: "", estado: "completado", mensaje: "", fechaInicio: "" }
    ]);

    expect(component.listaDeAplicaciones().length).toBe(1);
  });

  it("cargarSalud: acepta respuesta como array y limita a 5 elementos", function() {
    montarConRuta(null);
    fixture.detectChanges();

    component.cargarSalud("srv-y");
    const peticion = httpMock.expectOne("/api/health/srv-y");
    peticion.flush([
      { estado: "online", tiempoRespuestaMs: 1, fechaComprobacion: "f1" },
      { estado: "online", tiempoRespuestaMs: 2, fechaComprobacion: "f2" },
      { estado: "online", tiempoRespuestaMs: 3, fechaComprobacion: "f3" },
      { estado: "online", tiempoRespuestaMs: 4, fechaComprobacion: "f4" },
      { estado: "online", tiempoRespuestaMs: 5, fechaComprobacion: "f5" },
      { estado: "online", tiempoRespuestaMs: 6, fechaComprobacion: "f6" }
    ]);

    expect(component.historialSalud().length).toBe(5);
    expect(component.estadoSalud()?.tiempoRespuestaMs).toBe(1);
  });

  it("cargarSubdominios: acepta respuesta como array plano", function() {
    montarConRuta(null);
    fixture.detectChanges();

    component.cargarSubdominios("srv-sub");
    const peticion = httpMock.expectOne("/api/subdominios/servidor/srv-sub");
    peticion.flush([{ id: "s-1", nombre: "n", tipo: "A", destino: "d", sslActivo: false }]);

    expect(component.listaSubdominios().length).toBe(1);
  });

  it("eliminarSubdominio: llama a DELETE y recarga subdominios", function() {
    montarConRuta(null);
    fixture.detectChanges();
    component.servidorId.set("srv-del");

    component.eliminarSubdominio("sub-1");

    const peticionDelete = httpMock.expectOne("/api/subdominios/sub-1");
    expect(peticionDelete.request.method).toBe("DELETE");
    peticionDelete.flush({});

    const peticionRecarga = httpMock.expectOne("/api/subdominios/servidor/srv-del");
    peticionRecarga.flush({ success: true, message: "OK", data: [] });

    expect(component.listaSubdominios()).toEqual([]);
  });

  it("reiniciarServidor: marca warning y termina en estado online tras 5s", fakeAsync(function() {
    montarConRuta(null);
    fixture.detectChanges();
    component.servidorId.set("srv-r");

    component.reiniciarServidor();

    expect(component.reiniciando()).toBeTrue();
    expect(component.servidorEstado()).toBe("warning");

    const peticionReboot = httpMock.expectOne("/api/servidores/srv-r/reboot");
    expect(peticionReboot.request.method).toBe("POST");
    peticionReboot.flush({ success: true, message: "OK" });

    tick(5000);

    const peticionServidor = httpMock.expectOne("/api/servidores/srv-r");
    peticionServidor.flush({
      success: true,
      message: "OK",
      data: crearServidor({ id: "srv-r", estado: "conectado" })
    });

    expect(component.reiniciando()).toBeFalse();
    expect(component.servidorEstado()).toBe("online");
  }));

  it("reiniciarServidor: tras reboot si el servidor sigue desconectado queda offline", fakeAsync(function() {
    montarConRuta(null);
    fixture.detectChanges();
    component.servidorId.set("srv-r2");

    component.reiniciarServidor();

    const peticionReboot = httpMock.expectOne("/api/servidores/srv-r2/reboot");
    peticionReboot.flush({ success: true, message: "OK" });

    tick(5000);

    const peticionServidor = httpMock.expectOne("/api/servidores/srv-r2");
    peticionServidor.flush({
      success: true,
      message: "OK",
      data: crearServidor({ id: "srv-r2", estado: "desconectado" })
    });

    expect(component.servidorEstado()).toBe("offline");
  }));

  it("reiniciarServidor: en error de la peticion se vuelve a estado offline", function() {
    montarConRuta(null);
    fixture.detectChanges();
    component.servidorId.set("srv-r3");

    component.reiniciarServidor();

    const peticionReboot = httpMock.expectOne("/api/servidores/srv-r3/reboot");
    peticionReboot.error(new ProgressEvent("network"), { status: 500, statusText: "Server Error" });

    expect(component.reiniciando()).toBeFalse();
    expect(component.servidorEstado()).toBe("offline");
  });

  it("ngOnDestroy: desconecta del servicio de metricas", function() {
    montarConRuta(null);
    fixture.detectChanges();
    component.ngOnDestroy();
    expect(metricasFake.desconectar).toHaveBeenCalled();
  });
});
