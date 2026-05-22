import { ComponentFixture, TestBed, fakeAsync, tick } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting, HttpTestingController } from "@angular/common/http/testing";
import { provideRouter } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import { Firewall } from "./firewall";

describe("Firewall", function() {
  let componente: Firewall;
  let fixture: ComponentFixture<Firewall>;
  let httpMock: HttpTestingController;

  const listaServidoresFake = [
    {
      id: "srv-1",
      nombre: "Servidor 1",
      direccionIp: "1.2.3.4",
      puertoSsh: 22,
      usuarioSsh: "root",
      metodoAutenticacion: "key",
      estado: "conectado",
      fechaCreacion: "2026-05-22"
    },
    {
      id: "srv-2",
      nombre: "Servidor 2",
      direccionIp: "5.6.7.8",
      puertoSsh: 22,
      usuarioSsh: "root",
      metodoAutenticacion: "key",
      estado: "conectado",
      fechaCreacion: "2026-05-22"
    }
  ];

  const reglaFake = {
    id: "regla-1",
    servidorId: "srv-1",
    puerto: "80",
    protocolo: "TCP",
    accion: "allow",
    origen: "0.0.0.0/0",
    descripcion: "HTTP"
  };

  beforeEach(async function() {
    await TestBed.configureTestingModule({
      imports: [Firewall, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Firewall);
    componente = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(function() {
    httpMock.verify();
  });

  function inicializarConServidores(): void {
    fixture.detectChanges();
    const peticionServidores = httpMock.expectOne("/api/servidores");
    peticionServidores.flush({ success: true, message: "OK", data: listaServidoresFake });
    const peticionReglas = httpMock.expectOne("/api/firewall/servidor/srv-1");
    peticionReglas.flush({ success: true, message: "OK", data: [reglaFake] });
  }

  it("debe crear el componente", function() {
    expect(componente).toBeTruthy();
  });

  it("inicia con valores por defecto en los signals", function() {
    expect(componente.cargando()).toBeTrue();
    expect(componente.listaDeReglas().length).toBe(0);
    expect(componente.nuevoProtocolo()).toBe("TCP");
    expect(componente.nuevaAccion()).toBe("allow");
    expect(componente.nuevoOrigen()).toBe("0.0.0.0/0");
  });

  it("cargarServidores selecciona el primero y pide sus reglas", function() {
    inicializarConServidores();
    expect(componente.listaServidores().length).toBe(2);
    expect(componente.servidorSeleccionadoId()).toBe("srv-1");
    expect(componente.listaDeReglas().length).toBe(1);
    expect(componente.firewallActivo()).toBeTrue();
    expect(componente.cargando()).toBeFalse();
  });

  it("cargarServidores sin servidores deja cargando en false", function() {
    fixture.detectChanges();
    const peticion = httpMock.expectOne("/api/servidores");
    peticion.flush({ success: true, message: "OK", data: [] });
    expect(componente.cargando()).toBeFalse();
    expect(componente.listaServidores().length).toBe(0);
  });

  it("cargarServidores con error mantiene listas vacias", function() {
    fixture.detectChanges();
    const peticion = httpMock.expectOne("/api/servidores");
    peticion.error(new ProgressEvent("net"), { status: 500, statusText: "fail" });
    expect(componente.cargando()).toBeFalse();
  });

  it("cargarReglas con respuesta array directo funciona", function() {
    fixture.detectChanges();
    httpMock.expectOne("/api/servidores").flush({ success: true, message: "OK", data: listaServidoresFake });
    const peticion = httpMock.expectOne("/api/firewall/servidor/srv-1");
    peticion.flush([reglaFake, { ...reglaFake, id: "regla-2" }]);
    expect(componente.listaDeReglas().length).toBe(2);
  });

  it("cargarReglas con error deja la lista vacia", function() {
    fixture.detectChanges();
    httpMock.expectOne("/api/servidores").flush({ success: true, message: "OK", data: listaServidoresFake });
    const peticion = httpMock.expectOne("/api/firewall/servidor/srv-1");
    peticion.error(new ProgressEvent("net"), { status: 500, statusText: "fail" });
    expect(componente.listaDeReglas().length).toBe(0);
    expect(componente.cargando()).toBeFalse();
  });

  it("cambiarServidor recarga reglas del nuevo servidor", function() {
    inicializarConServidores();
    componente.cambiarServidor("srv-2");
    expect(componente.servidorSeleccionadoId()).toBe("srv-2");
    const peticion = httpMock.expectOne("/api/firewall/servidor/srv-2");
    peticion.flush({ success: true, message: "OK", data: [] });
    expect(componente.listaDeReglas().length).toBe(0);
    expect(componente.firewallActivo()).toBeFalse();
  });

  it("mostrarFormularioAgregar y cancelarFormulario alternan el flag", function() {
    componente.mostrarFormularioAgregar();
    expect(componente.mostrarFormulario()).toBeTrue();
    componente.nuevoPuerto.set("8080");
    componente.nuevaDescripcion.set("test");
    componente.cancelarFormulario();
    expect(componente.mostrarFormulario()).toBeFalse();
    expect(componente.nuevoPuerto()).toBe("");
    expect(componente.nuevaDescripcion()).toBe("");
  });

  it("agregarPreset no hace peticion si no hay servidor seleccionado", function() {
    componente.agregarPreset("22", "SSH");
    httpMock.expectNone("/api/firewall/regla");
  });

  it("agregarPreset no hace peticion si el puerto ya existe", function() {
    inicializarConServidores();
    componente.agregarPreset("80", "HTTP");
    httpMock.expectNone("/api/firewall/regla");
  });

  it("agregarPreset OK recarga las reglas", function() {
    inicializarConServidores();
    componente.agregarPreset("443", "HTTPS");
    const peticion = httpMock.expectOne("/api/firewall/regla");
    expect(peticion.request.method).toBe("POST");
    expect(peticion.request.body.puerto).toBe("443");
    peticion.flush({ success: true, message: "OK", data: {} });
    httpMock.expectOne("/api/firewall/servidor/srv-1").flush({ success: true, message: "OK", data: [reglaFake] });
    expect(componente.guardando()).toBeFalse();
  });

  it("agregarPreset con error muestra mensaje y lo limpia luego", fakeAsync(function() {
    inicializarConServidores();
    componente.agregarPreset("443", "HTTPS");
    const peticion = httpMock.expectOne("/api/firewall/regla");
    peticion.error(new ProgressEvent("net"), { status: 500, statusText: "fail" });
    expect(componente.guardando()).toBeFalse();
    expect(componente.mensajeError().length).toBeGreaterThan(0);
    tick(3000);
    expect(componente.mensajeError()).toBe("");
  }));

  it("agregarPresetSsh envia puerto 22", function() {
    inicializarConServidores();
    componente.agregarPresetSsh();
    const peticion = httpMock.expectOne("/api/firewall/regla");
    expect(peticion.request.body.puerto).toBe("22");
    peticion.flush({ success: true, message: "OK", data: {} });
    httpMock.expectOne("/api/firewall/servidor/srv-1").flush({ success: true, message: "OK", data: [] });
  });

  it("agregarPresetHttp envia puerto 80 (ya existe, no peticion)", function() {
    inicializarConServidores();
    componente.agregarPresetHttp();
    httpMock.expectNone("/api/firewall/regla");
  });

  it("agregarPresetHttps envia puerto 443", function() {
    inicializarConServidores();
    componente.agregarPresetHttps();
    const peticion = httpMock.expectOne("/api/firewall/regla");
    expect(peticion.request.body.puerto).toBe("443");
    peticion.flush({ success: true, message: "OK", data: {} });
    httpMock.expectOne("/api/firewall/servidor/srv-1").flush({ success: true, message: "OK", data: [] });
  });

  it("agregarPresetMysql envia puerto 3306", function() {
    inicializarConServidores();
    componente.agregarPresetMysql();
    const peticion = httpMock.expectOne("/api/firewall/regla");
    expect(peticion.request.body.puerto).toBe("3306");
    peticion.flush({ success: true, message: "OK", data: {} });
    httpMock.expectOne("/api/firewall/servidor/srv-1").flush({ success: true, message: "OK", data: [] });
  });

  it("agregarPresetPostgres envia puerto 5432", function() {
    inicializarConServidores();
    componente.agregarPresetPostgres();
    const peticion = httpMock.expectOne("/api/firewall/regla");
    expect(peticion.request.body.puerto).toBe("5432");
    peticion.flush({ success: true, message: "OK", data: {} });
    httpMock.expectOne("/api/firewall/servidor/srv-1").flush({ success: true, message: "OK", data: [] });
  });

  it("agregarRegla sin puerto no llama backend", function() {
    inicializarConServidores();
    componente.nuevoPuerto.set("");
    componente.agregarRegla();
    httpMock.expectNone("/api/firewall/regla");
  });

  it("agregarRegla sin servidor no llama backend", function() {
    componente.nuevoPuerto.set("8080");
    componente.servidorSeleccionadoId.set("");
    componente.agregarRegla();
    httpMock.expectNone("/api/firewall/regla");
  });

  it("agregarRegla OK cierra el formulario y recarga", function() {
    inicializarConServidores();
    componente.mostrarFormularioAgregar();
    componente.nuevoPuerto.set("8080");
    componente.nuevaDescripcion.set("Web app");
    componente.agregarRegla();
    const peticion = httpMock.expectOne("/api/firewall/regla");
    expect(peticion.request.body.puerto).toBe("8080");
    peticion.flush({ success: true, message: "OK", data: {} });
    httpMock.expectOne("/api/firewall/servidor/srv-1").flush({ success: true, message: "OK", data: [] });
    expect(componente.mostrarFormulario()).toBeFalse();
    expect(componente.guardando()).toBeFalse();
  });

  it("agregarRegla con error muestra mensaje y lo limpia", fakeAsync(function() {
    inicializarConServidores();
    componente.nuevoPuerto.set("8080");
    componente.agregarRegla();
    const peticion = httpMock.expectOne("/api/firewall/regla");
    peticion.error(new ProgressEvent("net"), { status: 500, statusText: "fail" });
    expect(componente.mensajeError().length).toBeGreaterThan(0);
    tick(3000);
    expect(componente.mensajeError()).toBe("");
  }));

  it("eliminarRegla OK recarga la lista", function() {
    inicializarConServidores();
    componente.eliminarRegla("regla-1");
    const peticion = httpMock.expectOne("/api/firewall/regla/regla-1");
    expect(peticion.request.method).toBe("DELETE");
    peticion.flush({ success: true, message: "OK", data: {} });
    httpMock.expectOne("/api/firewall/servidor/srv-1").flush({ success: true, message: "OK", data: [] });
  });

  it("eliminarRegla con error muestra mensaje y lo limpia", fakeAsync(function() {
    inicializarConServidores();
    componente.eliminarRegla("regla-1");
    const peticion = httpMock.expectOne("/api/firewall/regla/regla-1");
    peticion.error(new ProgressEvent("net"), { status: 500, statusText: "fail" });
    expect(componente.mensajeError().length).toBeGreaterThan(0);
    tick(3000);
    expect(componente.mensajeError()).toBe("");
  }));
});
