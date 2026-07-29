import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting, HttpTestingController } from "@angular/common/http/testing";
import { MetricasServidorService, MetricaServidor } from "./metricas-servidor.service";

describe("MetricasServidorService", function() {
  let service: MetricasServidorService;
  let http: HttpTestingController;

  beforeEach(function() {
    sessionStorage.clear();
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        MetricasServidorService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(MetricasServidorService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(function() {
    http.verify();
    service.desconectar();
    sessionStorage.clear();
    localStorage.clear();
  });

  function metricaDemo(servidorId: string): MetricaServidor {
    return {
      id: "m-1",
      servidorId,
      cpuPorcentaje: 50,
      ramUsadaMb: 1024,
      ramTotalMb: 4096,
      discoUsadoPorcentaje: 60,
      discoUsadoGb: 30,
      discoTotalGb: 50,
      cargaPromedio: 0.75,
      tiempoEncendidoSegundos: 86400,
      webDesplegadas: [],
      containersDocker: [],
      sesionActiva: true,
      fechaMedicion: "2026-05-22T12:00:00"
    };
  }

  function crearWebSocketFake(): any {
    const listeners: { [tipo: string]: Function[] } = {};
    return {
      readyState: WebSocket.CONNECTING,
      addEventListener: function(tipo: string, callback: Function): void {
        if (listeners[tipo] === undefined) {
          listeners[tipo] = [];
        }
        listeners[tipo].push(callback);
      },
      send: function(): void {},
      close: function(): void {},
      disparar: function(tipo: string, evento: any): void {
        const callbacks = listeners[tipo] || [];
        for (const cb of callbacks) {
          cb(evento);
        }
      }
    };
  }

  it("se crea correctamente y empieza con mapa vacio", function() {
    expect(service).toBeTruthy();
    expect(service.metricasPorServidor().size).toBe(0);
  });

  it("cargarUltimaMetrica: GET correcto y guarda en el mapa", async function() {
    const promesa = service.cargarUltimaMetrica("srv-1");
    const req = http.expectOne("/api/metricas/srv-1/ultima");
    expect(req.request.method).toBe("GET");
    req.flush(metricaDemo("srv-1"));

    const resultado = await promesa;
    expect(resultado).not.toBeNull();
    expect(resultado!.servidorId).toBe("srv-1");
    expect(service.obtenerMetrica("srv-1")).not.toBeNull();
  });

  it("cargarUltimaMetrica: devuelve null si la peticion falla", async function() {
    const promesa = service.cargarUltimaMetrica("srv-x");
    const req = http.expectOne("/api/metricas/srv-x/ultima");
    req.flush("nope", { status: 404, statusText: "Not Found" });

    const resultado = await promesa;
    expect(resultado).toBeNull();
  });

  it("obtenerMetrica: null si no hay metrica cacheada", function() {
    expect(service.obtenerMetrica("inexistente")).toBeNull();
  });

  it("desconectar: idempotente, no falla si no hay conexion", function() {
    service.desconectar();
    service.desconectar();
    expect(service.metricasPorServidor().size).toBe(0);
  });

  it("conectarTiempoReal: abre un WebSocket e incluye el token en la url", function() {
    sessionStorage.setItem("token", "token-demo");
    const wsFake = crearWebSocketFake();
    const espia = spyOn(window as any, "WebSocket").and.returnValue(wsFake);

    service.conectarTiempoReal();

    expect(espia).toHaveBeenCalled();
    const urlUsada = espia.calls.mostRecent().args[0] as string;
    const usaProtocoloValido = urlUsada.startsWith("ws:") || urlUsada.startsWith("wss:");
    expect(usaProtocoloValido).toBeTrue();
    expect(urlUsada.indexOf("token-demo")).toBeGreaterThan(-1);
  });

  it("conectarTiempoReal: usa token de localStorage si no hay en session", function() {
    localStorage.setItem("token", "token-local");
    const wsFake = crearWebSocketFake();
    const espia = spyOn(window as any, "WebSocket").and.returnValue(wsFake);

    service.conectarTiempoReal();

    const urlUsada = espia.calls.mostRecent().args[0] as string;
    expect(urlUsada.indexOf("token-local")).toBeGreaterThan(-1);
  });

  it("conectarTiempoReal: no abre dos sockets si ya hay uno conectando", function() {
    const wsFake = crearWebSocketFake();
    wsFake.readyState = WebSocket.CONNECTING;
    const espia = spyOn(window as any, "WebSocket").and.returnValue(wsFake);

    service.conectarTiempoReal();
    service.conectarTiempoReal();

    expect(espia).toHaveBeenCalledTimes(1);
  });

  it("conectarTiempoReal: no abre dos sockets si el actual esta OPEN", function() {
    const wsFake = crearWebSocketFake();
    const espia = spyOn(window as any, "WebSocket").and.returnValue(wsFake);

    service.conectarTiempoReal();
    wsFake.readyState = WebSocket.OPEN;
    service.conectarTiempoReal();

    expect(espia).toHaveBeenCalledTimes(1);
  });

  it("conectarTiempoReal: mensaje WS valido actualiza el mapa", function() {
    const wsFake = crearWebSocketFake();
    spyOn(window as any, "WebSocket").and.returnValue(wsFake);

    service.conectarTiempoReal();
    const metrica = metricaDemo("srv-ws");
    wsFake.disparar("message", { data: JSON.stringify(metrica) });

    expect(service.obtenerMetrica("srv-ws")).not.toBeNull();
  });

  it("conectarTiempoReal: mensaje WS invalido no rompe el servicio", function() {
    const wsFake = crearWebSocketFake();
    spyOn(window as any, "WebSocket").and.returnValue(wsFake);
    spyOn(console, "warn");

    service.conectarTiempoReal();
    wsFake.disparar("message", { data: "no-es-json{{" });

    expect(console.warn).toHaveBeenCalled();
  });

  it("conectarTiempoReal: error en WS llama close del socket", function() {
    const wsFake = crearWebSocketFake();
    const espiaClose = spyOn(wsFake, "close");
    spyOn(window as any, "WebSocket").and.returnValue(wsFake);

    service.conectarTiempoReal();
    wsFake.disparar("error", {});

    expect(espiaClose).toHaveBeenCalled();
  });

  it("conectarTiempoReal: close programa reconexion via setTimeout", function() {
    const espiaTimeout = spyOn(window, "setTimeout").and.returnValue(123 as any);
    const wsFake = crearWebSocketFake();
    spyOn(window as any, "WebSocket").and.returnValue(wsFake);

    service.conectarTiempoReal();
    wsFake.disparar("close", {});
    wsFake.disparar("close", {});

    expect(espiaTimeout).toHaveBeenCalledTimes(1);
  });

  it("desconectar: limpia timeout pendiente y cierra socket", function() {
    spyOn(window, "setTimeout").and.returnValue(999 as any);
    const espiaClear = spyOn(window, "clearTimeout");
    const wsFake = crearWebSocketFake();
    const espiaClose = spyOn(wsFake, "close");
    spyOn(window as any, "WebSocket").and.returnValue(wsFake);

    service.conectarTiempoReal();
    wsFake.disparar("close", {});
    service.desconectar();

    expect(espiaClear).toHaveBeenCalledWith(999 as any);
    expect(espiaClose).toHaveBeenCalled();
  });
});
