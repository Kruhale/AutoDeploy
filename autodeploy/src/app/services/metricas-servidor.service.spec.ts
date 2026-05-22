import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting, HttpTestingController } from "@angular/common/http/testing";
import { MetricasServidorService, MetricaServidor } from "./metricas-servidor.service";

describe("MetricasServidorService", function() {
  let service: MetricasServidorService;
  let http: HttpTestingController;

  beforeEach(function() {
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
});
