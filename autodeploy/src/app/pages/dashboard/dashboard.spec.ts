import { ComponentFixture, TestBed } from "@angular/core/testing";
import { HttpClientTestingModule, HttpTestingController } from "@angular/common/http/testing";
import { provideRouter } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import { signal } from "@angular/core";
import { of } from "rxjs";
import { Dashboard } from "./dashboard";
import { ServidorService, ServidorRemoto } from "../../services/servidor.service";
import { MetricasServidorService } from "../../services/metricas-servidor.service";

describe("Dashboard", function() {
  let componente: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  let servidorServiceSpy: jasmine.SpyObj<ServidorService>;
  let metricasServiceMock: { conectarTiempoReal: jasmine.Spy; metricasPorServidor: ReturnType<typeof signal> };

  beforeEach(async function() {
    servidorServiceSpy = jasmine.createSpyObj<ServidorService>("ServidorService", ["listar"]);
    servidorServiceSpy.listar.and.returnValue(of([
      { id: "s1", nombre: "Test Demo", direccionIp: "1.2.3.4", puertoSsh: 22, usuarioSsh: "root", estado: "conectado" } as ServidorRemoto,
      { id: "s2", nombre: "Server Down", direccionIp: "9.9.9.9", puertoSsh: 22, usuarioSsh: "root", estado: "desconectado" } as ServidorRemoto
    ]));

    metricasServiceMock = {
      conectarTiempoReal: jasmine.createSpy("conectarTiempoReal"),
      metricasPorServidor: signal({})
    };

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
    expect(servidorServiceSpy.listar).toHaveBeenCalled();
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
});
