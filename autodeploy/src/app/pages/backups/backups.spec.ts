import { ComponentFixture, TestBed, fakeAsync, tick } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting, HttpTestingController } from "@angular/common/http/testing";
import { provideRouter } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import { Backups } from "./backups";

describe("Backups", function() {
  let componente: Backups;
  let fixture: ComponentFixture<Backups>;
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

  const backupCompletado = {
    id: "bk-1",
    servidorId: "srv-1",
    nombre: "auto-1.tar.gz",
    tipo: "auto",
    estado: "completado",
    tamano: "1MB",
    fechaCreacion: "2026-05-22"
  };

  const backupEnProgreso = {
    id: "bk-2",
    servidorId: "srv-1",
    nombre: "auto-2.tar.gz",
    tipo: "manual",
    estado: "en_progreso",
    tamano: "0",
    fechaCreacion: "2026-05-22"
  };

  beforeEach(async function() {
    await TestBed.configureTestingModule({
      imports: [Backups, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Backups);
    componente = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(function() {
    httpMock.verify();
  });

  function inicializarConServidores(): void {
    fixture.detectChanges();
    httpMock.expectOne("/api/servidores").flush({ success: true, message: "OK", data: listaServidoresFake });
    httpMock.expectOne("/api/backups/servidor/srv-1").flush({ success: true, message: "OK", data: [backupCompletado] });
    httpMock.expectOne("/api/backups/auto/srv-1").flush({ success: true, message: "OK", data: { activado: true, hora: "04:30" } });
  }

  it("debe crear el componente", function() {
    expect(componente).toBeTruthy();
  });

  it("inicia con signals por defecto", function() {
    expect(componente.cargando()).toBeTrue();
    expect(componente.listaDeBackups().length).toBe(0);
    expect(componente.backupsAutomaticos()).toBeFalse();
    expect(componente.horaBackupAutomatico()).toBe("03:00");
    expect(componente.creandoBackup()).toBeFalse();
  });

  it("cargarServidores selecciona el primero y carga backups y estado auto", function() {
    inicializarConServidores();
    expect(componente.servidorSeleccionadoId()).toBe("srv-1");
    expect(componente.listaDeBackups().length).toBe(1);
    expect(componente.cargando()).toBeFalse();
    expect(componente.backupsAutomaticos()).toBeTrue();
    expect(componente.horaBackupAutomatico()).toBe("04:30");
  });

  it("cargarServidores sin servidores deja cargando en false", function() {
    fixture.detectChanges();
    httpMock.expectOne("/api/servidores").flush({ success: true, message: "OK", data: [] });
    expect(componente.cargando()).toBeFalse();
  });

  it("cargarServidores con error deja cargando en false", function() {
    fixture.detectChanges();
    const peticion = httpMock.expectOne("/api/servidores");
    peticion.error(new ProgressEvent("net"), { status: 500, statusText: "fail" });
    expect(componente.cargando()).toBeFalse();
  });

  it("cargarEstadoAutoBackup con error desactiva backups automaticos", function() {
    fixture.detectChanges();
    httpMock.expectOne("/api/servidores").flush({ success: true, message: "OK", data: listaServidoresFake });
    httpMock.expectOne("/api/backups/servidor/srv-1").flush({ success: true, message: "OK", data: [] });
    const peticion = httpMock.expectOne("/api/backups/auto/srv-1");
    peticion.error(new ProgressEvent("net"), { status: 500, statusText: "fail" });
    expect(componente.backupsAutomaticos()).toBeFalse();
  });

  it("cargarEstadoAutoBackup sin data usa valores por defecto", function() {
    fixture.detectChanges();
    httpMock.expectOne("/api/servidores").flush({ success: true, message: "OK", data: listaServidoresFake });
    httpMock.expectOne("/api/backups/servidor/srv-1").flush({ success: true, message: "OK", data: [] });
    httpMock.expectOne("/api/backups/auto/srv-1").flush({ success: true, message: "OK", data: null });
    expect(componente.backupsAutomaticos()).toBeFalse();
    expect(componente.horaBackupAutomatico()).toBe("03:00");
  });

  it("cargarBackups soporta respuesta como array directo", function() {
    fixture.detectChanges();
    httpMock.expectOne("/api/servidores").flush({ success: true, message: "OK", data: listaServidoresFake });
    httpMock.expectOne("/api/backups/servidor/srv-1").flush([backupCompletado, { ...backupCompletado, id: "bk-3" }]);
    httpMock.expectOne("/api/backups/auto/srv-1").flush({ success: true, message: "OK", data: { activado: false, hora: "03:00" } });
    expect(componente.listaDeBackups().length).toBe(2);
  });

  it("cargarBackups con error deja la lista vacia", function() {
    fixture.detectChanges();
    httpMock.expectOne("/api/servidores").flush({ success: true, message: "OK", data: listaServidoresFake });
    const peticion = httpMock.expectOne("/api/backups/servidor/srv-1");
    peticion.error(new ProgressEvent("net"), { status: 500, statusText: "fail" });
    httpMock.expectOne("/api/backups/auto/srv-1").flush({ success: true, message: "OK", data: { activado: false, hora: "03:00" } });
    expect(componente.listaDeBackups().length).toBe(0);
    expect(componente.cargando()).toBeFalse();
  });

  it("cambiarServidor recarga backups y estado auto del nuevo servidor", function() {
    inicializarConServidores();
    componente.cambiarServidor("srv-2");
    expect(componente.servidorSeleccionadoId()).toBe("srv-2");
    httpMock.expectOne("/api/backups/servidor/srv-2").flush({ success: true, message: "OK", data: [] });
    httpMock.expectOne("/api/backups/auto/srv-2").flush({ success: true, message: "OK", data: { activado: false, hora: "03:00" } });
    expect(componente.listaDeBackups().length).toBe(0);
  });

  it("cargarBackups con backup en progreso arranca el temporizador", fakeAsync(function() {
    fixture.detectChanges();
    httpMock.expectOne("/api/servidores").flush({ success: true, message: "OK", data: listaServidoresFake });
    httpMock.expectOne("/api/backups/servidor/srv-1").flush({ success: true, message: "OK", data: [backupEnProgreso] });
    httpMock.expectOne("/api/backups/auto/srv-1").flush({ success: true, message: "OK", data: { activado: false, hora: "03:00" } });
    tick(4000);
    httpMock.expectOne("/api/backups/servidor/srv-1").flush({ success: true, message: "OK", data: [backupCompletado] });
    (componente as any).detenerRefresco();
  }));

  it("alternarBackupsAutomaticos sin servidor no llama backend", function() {
    componente.alternarBackupsAutomaticos();
    httpMock.expectNone(function(req) { return req.url.startsWith("/api/backups/auto/"); });
  });

  it("alternarBackupsAutomaticos activando muestra mensaje exito", fakeAsync(function() {
    inicializarConServidores();
    componente.backupsAutomaticos.set(false);
    componente.alternarBackupsAutomaticos();
    const peticion = httpMock.expectOne("/api/backups/auto/srv-1");
    expect(peticion.request.method).toBe("PUT");
    expect(peticion.request.body.activado).toBeTrue();
    peticion.flush({ success: true, message: "OK", data: {} });
    expect(componente.backupsAutomaticos()).toBeTrue();
    expect(componente.guardandoAutoBackup()).toBeFalse();
    expect(componente.mensajeExito().length).toBeGreaterThan(0);
    tick(4000);
    expect(componente.mensajeExito()).toBe("");
  }));

  it("alternarBackupsAutomaticos desactivando muestra mensaje exito distinto", fakeAsync(function() {
    inicializarConServidores();
    componente.alternarBackupsAutomaticos();
    const peticion = httpMock.expectOne("/api/backups/auto/srv-1");
    expect(peticion.request.body.activado).toBeFalse();
    peticion.flush({ success: true, message: "OK", data: {} });
    expect(componente.backupsAutomaticos()).toBeFalse();
    expect(componente.mensajeExito().length).toBeGreaterThan(0);
    tick(4000);
    expect(componente.mensajeExito()).toBe("");
  }));

  it("alternarBackupsAutomaticos con error muestra mensajeError", fakeAsync(function() {
    inicializarConServidores();
    componente.alternarBackupsAutomaticos();
    const peticion = httpMock.expectOne("/api/backups/auto/srv-1");
    peticion.error(new ProgressEvent("net"), { status: 500, statusText: "fail" });
    expect(componente.guardandoAutoBackup()).toBeFalse();
    expect(componente.mensajeError().length).toBeGreaterThan(0);
    tick(4000);
    expect(componente.mensajeError()).toBe("");
  }));

  it("crearBackup sin servidor no llama backend", function() {
    componente.crearBackup();
    httpMock.expectNone("/api/backups");
  });

  it("crearBackup OK recarga la lista", function() {
    inicializarConServidores();
    componente.crearBackup();
    const peticion = httpMock.expectOne("/api/backups");
    expect(peticion.request.method).toBe("POST");
    expect(peticion.request.body).toEqual({ servidorId: "srv-1", tipo: "manual" });
    peticion.flush({ success: true, message: "OK", data: {} });
    httpMock.expectOne("/api/backups/servidor/srv-1").flush({ success: true, message: "OK", data: [] });
    expect(componente.creandoBackup()).toBeFalse();
  });

  it("crearBackup con error muestra mensaje y lo limpia", fakeAsync(function() {
    inicializarConServidores();
    componente.crearBackup();
    const peticion = httpMock.expectOne("/api/backups");
    peticion.error(new ProgressEvent("net"), { status: 500, statusText: "fail" });
    expect(componente.creandoBackup()).toBeFalse();
    expect(componente.mensajeError().length).toBeGreaterThan(0);
    tick(3000);
    expect(componente.mensajeError()).toBe("");
  }));

  it("confirmarEliminarBackup OK recarga la lista", function() {
    inicializarConServidores();
    componente.solicitarEliminarBackup("bk-1");
    componente.confirmarEliminarBackup();
    const peticion = httpMock.expectOne("/api/backups/bk-1");
    expect(peticion.request.method).toBe("DELETE");
    peticion.flush({ success: true, message: "OK", data: {} });
    httpMock.expectOne("/api/backups/servidor/srv-1").flush({ success: true, message: "OK", data: [] });
  });

  it("confirmarEliminarBackup con error muestra mensaje y lo limpia", fakeAsync(function() {
    inicializarConServidores();
    componente.solicitarEliminarBackup("bk-1");
    componente.confirmarEliminarBackup();
    const peticion = httpMock.expectOne("/api/backups/bk-1");
    peticion.error(new ProgressEvent("net"), { status: 500, statusText: "fail" });
    expect(componente.mensajeError().length).toBeGreaterThan(0);
    tick(3000);
    expect(componente.mensajeError()).toBe("");
  }));

  it("cancelar el dialogo de restaurar no hace peticion", function() {
    inicializarConServidores();
    componente.solicitarRestaurarBackup("bk-1");
    componente.cancelarDialogoBackup();
    componente.confirmarRestaurarBackup();
    httpMock.expectNone("/api/backups/bk-1/restaurar");
  });

  it("confirmarRestaurarBackup OK muestra mensaje exito y recarga", fakeAsync(function() {
    inicializarConServidores();
    componente.solicitarRestaurarBackup("bk-1");
    componente.confirmarRestaurarBackup();
    const peticion = httpMock.expectOne("/api/backups/bk-1/restaurar");
    expect(peticion.request.method).toBe("POST");
    peticion.flush({ success: true, message: "OK", data: {} });
    expect(componente.mensajeExito().length).toBeGreaterThan(0);
    tick(3000);
    httpMock.expectOne("/api/backups/servidor/srv-1").flush({ success: true, message: "OK", data: [] });
    expect(componente.mensajeExito()).toBe("");
  }));

  it("confirmarRestaurarBackup con error y detalle del backend muestra el detalle", fakeAsync(function() {
    inicializarConServidores();
    componente.solicitarRestaurarBackup("bk-1");
    componente.confirmarRestaurarBackup();
    const peticion = httpMock.expectOne("/api/backups/bk-1/restaurar");
    peticion.flush({ message: "detalle especifico" }, { status: 500, statusText: "fail" });
    expect(componente.mensajeError()).toBe("detalle especifico");
    tick(4000);
    expect(componente.mensajeError()).toBe("");
  }));

  it("confirmarRestaurarBackup con error sin detalle usa mensaje por defecto", fakeAsync(function() {
    inicializarConServidores();
    componente.solicitarRestaurarBackup("bk-1");
    componente.confirmarRestaurarBackup();
    const peticion = httpMock.expectOne("/api/backups/bk-1/restaurar");
    peticion.error(new ProgressEvent("net"), { status: 500, statusText: "fail" });
    expect(componente.mensajeError().length).toBeGreaterThan(0);
    tick(4000);
    expect(componente.mensajeError()).toBe("");
  }));
});
