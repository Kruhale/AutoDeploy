import { ComponentFixture, TestBed, fakeAsync, flush } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting, HttpTestingController } from "@angular/common/http/testing";
import { provideRouter } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import { Subject } from "rxjs";
import { signal } from "@angular/core";
import { LogsTerminal } from "./logs-terminal";
import { TerminalSshService } from "../../services/terminal-ssh.service";
import { ActividadService, ActividadLog } from "../../services/actividad.service";
import { ServidorService, ServidorRemoto } from "../../services/servidor.service";

class TerminalSshServiceFake {
  datosRecibidos = new Subject<string>();
  estadoConexion = signal<"desconectado" | "conectando" | "conectado" | "error">("desconectado");
  enviarEntrada = jasmine.createSpy("enviarEntrada");
  enviarRedimensionar = jasmine.createSpy("enviarRedimensionar");
  conectar = jasmine.createSpy("conectar");
  desconectar = jasmine.createSpy("desconectar");
}

function crearActividad(parcial: Partial<ActividadLog>): ActividadLog {
  return {
    id: parcial.id || "a-1",
    tipo: parcial.tipo || "info",
    mensaje: parcial.mensaje || "mensaje de prueba",
    icono: parcial.icono || "fa-info",
    fechaCreacion: parcial.fechaCreacion || "2026-05-22T12:34:56"
  };
}

function crearServidor(parcial: Partial<ServidorRemoto>): ServidorRemoto {
  return {
    id: parcial.id || "srv-1",
    nombre: parcial.nombre || "Servidor de prueba",
    direccionIp: parcial.direccionIp || "1.2.3.4",
    puertoSsh: parcial.puertoSsh || 22,
    usuarioSsh: parcial.usuarioSsh || "root",
    metodoAutenticacion: parcial.metodoAutenticacion || "password",
    estado: parcial.estado || "conectado",
    fechaCreacion: parcial.fechaCreacion || "2026-05-22T00:00:00"
  };
}

describe("LogsTerminal", function() {
  let component: LogsTerminal;
  let fixture: ComponentFixture<LogsTerminal>;
  let httpMock: HttpTestingController;
  let terminalFake: TerminalSshServiceFake;

  beforeEach(async function() {
    terminalFake = new TerminalSshServiceFake();
    await TestBed.configureTestingModule({
      imports: [LogsTerminal, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TerminalSshService, useValue: terminalFake }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LogsTerminal);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(function() {
    httpMock.verify();
  });

  it("debe crear el componente", function() {
    expect(component).toBeTruthy();
  });

  it("debe iniciar con valores por defecto en los signals", function() {
    expect(component.filtroActivo()).toBe("all");
    expect(component.busquedaTexto()).toBe("");
    expect(component.listaDeServidores()).toEqual([]);
    expect(component.servidorSeleccionadoId()).toBeNull();
    expect(component.servidorSeleccionadoNombre()).toBe("");
    expect(component.cargandoLogs()).toBeTrue();
    expect(component.refrescandoFlujo()).toBeFalse();
    expect(component.entradasDeLog()).toEqual([]);
  });

  it("cambiarFiltro debe actualizar el signal filtroActivo", function() {
    component.cambiarFiltro("error");
    expect(component.filtroActivo()).toBe("error");

    component.cambiarFiltro("info");
    expect(component.filtroActivo()).toBe("info");

    component.cambiarFiltro("warn");
    expect(component.filtroActivo()).toBe("warn");

    component.cambiarFiltro("all");
    expect(component.filtroActivo()).toBe("all");
  });

  it("obtenerEntradasFiltradas: sin filtros devuelve todas las entradas", function() {
    component.entradasDeLog.set([
      { hora: "12:00:00", nivel: "info", mensaje: "uno", esDestacado: false },
      { hora: "12:00:01", nivel: "warn", mensaje: "dos", esDestacado: false }
    ]);
    const resultado = component.obtenerEntradasFiltradas();
    expect(resultado.length).toBe(2);
  });

  it("obtenerEntradasFiltradas: filtro error incluye crit", function() {
    component.entradasDeLog.set([
      { hora: "12:00:00", nivel: "info", mensaje: "uno", esDestacado: false },
      { hora: "12:00:01", nivel: "error", mensaje: "dos", esDestacado: true },
      { hora: "12:00:02", nivel: "crit", mensaje: "tres", esDestacado: true }
    ]);
    component.cambiarFiltro("error");
    const resultado = component.obtenerEntradasFiltradas();
    expect(resultado.length).toBe(2);
    expect(resultado[0].nivel).toBe("error");
    expect(resultado[1].nivel).toBe("crit");
  });

  it("obtenerEntradasFiltradas: filtro warn solo deja warn", function() {
    component.entradasDeLog.set([
      { hora: "12:00:00", nivel: "info", mensaje: "uno", esDestacado: false },
      { hora: "12:00:01", nivel: "warn", mensaje: "dos", esDestacado: false }
    ]);
    component.cambiarFiltro("warn");
    const resultado = component.obtenerEntradasFiltradas();
    expect(resultado.length).toBe(1);
    expect(resultado[0].nivel).toBe("warn");
  });

  it("obtenerEntradasFiltradas: aplica busqueda de texto en minusculas", function() {
    component.entradasDeLog.set([
      { hora: "12:00:00", nivel: "info", mensaje: "Despliegue completado", esDestacado: false },
      { hora: "12:00:01", nivel: "info", mensaje: "Backup creado", esDestacado: false }
    ]);
    component.busquedaTexto.set("backup");
    const resultado = component.obtenerEntradasFiltradas();
    expect(resultado.length).toBe(1);
    expect(resultado[0].mensaje).toBe("Backup creado");
  });

  it("exportarLogs: genera blob y dispara descarga del enlace", function() {
    component.entradasDeLog.set([
      { hora: "12:00:00", nivel: "info", mensaje: "linea uno", esDestacado: false },
      { hora: "12:00:01", nivel: "error", mensaje: "linea dos", esDestacado: true }
    ]);
    const enlaceSimulado = document.createElement("a");
    const espiaClick = spyOn(enlaceSimulado, "click");
    spyOn(document, "createElement").and.returnValue(enlaceSimulado);
    spyOn(URL, "createObjectURL").and.returnValue("blob:fake");
    spyOn(URL, "revokeObjectURL");

    component.exportarLogs();

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(espiaClick).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fake");
    expect(enlaceSimulado.download).toBe("logs-export.txt");
  });

  it("cambiarServidor: con id valido actualiza signals de seleccion", function() {
    const servidorUno = crearServidor({ id: "srv-1", nombre: "Uno" });
    const servidorDos = crearServidor({ id: "srv-2", nombre: "Dos" });
    component.listaDeServidores.set([servidorUno, servidorDos]);

    const eventoSimulado = { target: { value: "srv-2" } } as unknown as Event;
    component.cambiarServidor(eventoSimulado);

    expect(component.servidorSeleccionadoId()).toBe("srv-2");
    expect(component.servidorSeleccionadoNombre()).toBe("Dos");
  });

  it("cambiarServidor: con id inexistente limpia la seleccion", function() {
    component.listaDeServidores.set([crearServidor({ id: "srv-1" })]);
    component.servidorSeleccionadoId.set("srv-1");
    component.servidorSeleccionadoNombre.set("Algo");

    const eventoSimulado = { target: { value: "no-existe" } } as unknown as Event;
    component.cambiarServidor(eventoSimulado);

    expect(component.servidorSeleccionadoId()).toBeNull();
    expect(component.servidorSeleccionadoNombre()).toBe("");
  });

  it("conectarServidorSeleccionado: sin id seleccionado no llama a conectar", function() {
    component.conectarServidorSeleccionado();
    expect(terminalFake.conectar).not.toHaveBeenCalled();
  });

  it("conectarServidorSeleccionado: con id valido llama a terminalService.conectar", function() {
    const servidor = crearServidor({ id: "srv-9", nombre: "Nueve" });
    component.listaDeServidores.set([servidor]);
    component.servidorSeleccionadoId.set("srv-9");

    component.conectarServidorSeleccionado();

    expect(terminalFake.conectar).toHaveBeenCalledWith("srv-9");
    expect(component.servidorSeleccionadoNombre()).toBe("Nueve");
  });

  it("conectarServidorSeleccionado: con id que no esta en la lista no conecta", function() {
    component.listaDeServidores.set([crearServidor({ id: "otro" })]);
    component.servidorSeleccionadoId.set("inexistente");

    component.conectarServidorSeleccionado();

    expect(terminalFake.conectar).not.toHaveBeenCalled();
  });

  it("ngOnDestroy: llama a desconectar del terminalService", function() {
    component.ngOnDestroy();
    expect(terminalFake.desconectar).toHaveBeenCalled();
  });

  it("afterNextRender: dispara carga de servidores y actividad", fakeAsync(function() {
    spyOn(component as any, "prepararTerminalXterm").and.callFake(function() {});
    fixture.detectChanges();
    flush();

    const peticionServidores = httpMock.expectOne("/api/servidores");
    expect(peticionServidores.request.method).toBe("GET");
    peticionServidores.flush({
      success: true,
      message: "OK",
      data: [crearServidor({ id: "srv-unico", nombre: "Unico" })]
    });

    const peticionActividad = httpMock.expectOne("/api/actividad");
    expect(peticionActividad.request.method).toBe("GET");
    peticionActividad.flush({
      success: true,
      message: "OK",
      data: [
        crearActividad({ id: "a-1", tipo: "info", mensaje: "Algo paso", fechaCreacion: "2026-05-22T10:11:12" }),
        crearActividad({ id: "a-2", tipo: "error", mensaje: "Fallo", fechaCreacion: "2026-05-22T10:11:13" })
      ]
    });

    expect(component.listaDeServidores().length).toBe(1);
    expect(component.servidorSeleccionadoId()).toBe("srv-unico");
    expect(component.servidorSeleccionadoNombre()).toBe("Unico");

    expect(component.cargandoLogs()).toBeFalse();
    expect(component.entradasDeLog().length).toBe(2);
    const entradas = component.entradasDeLog();
    expect(entradas[0].hora).toBe("10:11:12");
    expect(entradas[0].nivel).toBe("info");
    expect(entradas[1].nivel).toBe("error");
    expect(entradas[1].esDestacado).toBeTrue();
  }));

  it("afterNextRender: con varios servidores no autoselecciona", fakeAsync(function() {
    spyOn(component as any, "prepararTerminalXterm").and.callFake(function() {});
    fixture.detectChanges();
    flush();

    const peticionServidores = httpMock.expectOne("/api/servidores");
    peticionServidores.flush({
      success: true,
      message: "OK",
      data: [crearServidor({ id: "srv-1" }), crearServidor({ id: "srv-2" })]
    });

    const peticionActividad = httpMock.expectOne("/api/actividad");
    peticionActividad.flush({ success: true, message: "OK", data: [] });

    expect(component.listaDeServidores().length).toBe(2);
    expect(component.servidorSeleccionadoId()).toBeNull();
  }));

  it("cargarActividadReciente: en caso de error vacia las entradas y termina carga", fakeAsync(function() {
    spyOn(component as any, "prepararTerminalXterm").and.callFake(function() {});
    fixture.detectChanges();
    flush();

    const peticionServidores = httpMock.expectOne("/api/servidores");
    peticionServidores.flush({ success: true, message: "OK", data: [] });

    const peticionActividad = httpMock.expectOne("/api/actividad");
    peticionActividad.error(new ProgressEvent("network"), { status: 500, statusText: "Server Error" });

    expect(component.entradasDeLog()).toEqual([]);
    expect(component.cargandoLogs()).toBeFalse();
  }));

  it("reiniciarFlujo: rellena entradas tras una nueva carga", fakeAsync(function() {
    component.entradasDeLog.set([]);
    component.reiniciarFlujo();
    expect(component.refrescandoFlujo()).toBeTrue();

    const peticionActividad = httpMock.expectOne("/api/actividad");
    peticionActividad.flush({
      success: true,
      message: "OK",
      data: [
        crearActividad({ id: "n-1", tipo: "warning", mensaje: "ojito", fechaCreacion: "2026-05-22T08:09:10" })
      ]
    });
    flush();

    expect(component.refrescandoFlujo()).toBeFalse();
    const entradas = component.entradasDeLog();
    expect(entradas.length).toBe(1);
    expect(entradas[0].nivel).toBe("warn");
    expect(entradas[0].hora).toBe("08:09:10");
  }));

  it("reiniciarFlujo: en error termina el refresco igualmente", fakeAsync(function() {
    component.reiniciarFlujo();
    const peticionActividad = httpMock.expectOne("/api/actividad");
    peticionActividad.error(new ProgressEvent("network"), { status: 500, statusText: "Server Error" });
    flush();

    expect(component.refrescandoFlujo()).toBeFalse();
  }));

  it("transformarActividad cubre los tipos success y critical via reiniciarFlujo", fakeAsync(function() {
    component.reiniciarFlujo();
    const peticionActividad = httpMock.expectOne("/api/actividad");
    peticionActividad.flush({
      success: true,
      message: "OK",
      data: [
        crearActividad({ id: "ok", tipo: "success", mensaje: "todo bien", fechaCreacion: "2026-05-22T01:02:03" }),
        crearActividad({ id: "cr", tipo: "critical", mensaje: "alerta", fechaCreacion: "2026-05-22T01:02:04" }),
        crearActividad({ id: "raro", tipo: "desconocido", mensaje: "sin tipo", fechaCreacion: "" })
      ]
    });
    flush();

    const entradas = component.entradasDeLog();
    expect(entradas[0].nivel).toBe("ok");
    expect(entradas[1].nivel).toBe("crit");
    expect(entradas[1].esDestacado).toBeTrue();
    expect(entradas[2].nivel).toBe("info");
    expect(entradas[2].hora.length).toBeGreaterThan(0);
  }));
});
