import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ActivatedRoute } from "@angular/router";
import { RouterTestingModule } from "@angular/router/testing";
import { TranslateModule } from "@ngx-translate/core";
import { Subject, Subscription, of } from "rxjs";
import { signal, WritableSignal } from "@angular/core";
import { TerminalSsh } from "./terminal-ssh";
import { TerminalSshService } from "../../services/terminal-ssh.service";
import { ServidorService, ServidorRemoto } from "../../services/servidor.service";

describe("TerminalSsh", function() {
  let fixture: ComponentFixture<TerminalSsh>;
  let componente: TerminalSsh;
  let terminalServiceMock: {
    conectar: jasmine.Spy;
    desconectar: jasmine.Spy;
    enviarEntrada: jasmine.Spy;
    enviarRedimensionar: jasmine.Spy;
    datosRecibidos: Subject<string>;
    estadoConexion: WritableSignal<"desconectado" | "conectando" | "conectado" | "error">;
  };
  let servidorServiceSpy: jasmine.SpyObj<ServidorService>;
  let mapaParametros: Map<string, string>;

  function construirRutaMock() {
    return {
      snapshot: {
        paramMap: {
          get: function(clave: string): string | null {
            return mapaParametros.get(clave) ?? null;
          }
        }
      }
    };
  }

  beforeEach(async function() {
    mapaParametros = new Map<string, string>();

    terminalServiceMock = {
      conectar: jasmine.createSpy("conectar"),
      desconectar: jasmine.createSpy("desconectar"),
      enviarEntrada: jasmine.createSpy("enviarEntrada"),
      enviarRedimensionar: jasmine.createSpy("enviarRedimensionar"),
      datosRecibidos: new Subject<string>(),
      estadoConexion: signal<"desconectado" | "conectando" | "conectado" | "error">("desconectado")
    };

    servidorServiceSpy = jasmine.createSpyObj<ServidorService>("ServidorService", ["obtenerPorId"]);
    const servidorMock: ServidorRemoto = {
      id: "srv-1",
      nombre: "Servidor Demo",
      direccionIp: "10.0.0.5",
      puertoSsh: 22,
      usuarioSsh: "root",
      metodoAutenticacion: "password",
      estado: "conectado",
      fechaCreacion: "2026-01-01"
    };
    servidorServiceSpy.obtenerPorId.and.returnValue(of(servidorMock));

    await TestBed.configureTestingModule({
      imports: [TerminalSsh, TranslateModule.forRoot(), RouterTestingModule],
      providers: [
        { provide: TerminalSshService, useValue: terminalServiceMock },
        { provide: ServidorService, useValue: servidorServiceSpy },
        { provide: ActivatedRoute, useValue: construirRutaMock() }
      ]
    }).compileComponents();
  });

  function crearComponente() {
    spyOn(TerminalSsh.prototype as unknown as { inicializarTerminal: () => void }, "inicializarTerminal");
    fixture = TestBed.createComponent(TerminalSsh);
    componente = fixture.componentInstance;
  }

  it("debe crear el componente", function() {
    crearComponente();
    expect(componente).toBeTruthy();
  });

  it("debe inicializar las señales con guion", function() {
    crearComponente();
    expect(componente.nombreServidor()).toBe("—");
    expect(componente.ipServidor()).toBe("—");
  });

  it("afterNextRender no hace nada si no hay servidorId en la ruta", function() {
    crearComponente();
    fixture.detectChanges();
    expect(servidorServiceSpy.obtenerPorId).not.toHaveBeenCalled();
  });

  it("afterNextRender carga el servidor y dispara inicializarTerminal si hay id", function() {
    mapaParametros.set("servidorId", "srv-1");
    crearComponente();
    fixture.detectChanges();

    expect(servidorServiceSpy.obtenerPorId).toHaveBeenCalledWith("srv-1");
    expect(componente.nombreServidor()).toBe("Servidor Demo");
    expect(componente.ipServidor()).toBe("10.0.0.5");
    const espia = (componente as unknown as { inicializarTerminal: jasmine.Spy }).inicializarTerminal;
    expect(espia).toHaveBeenCalledWith("srv-1");
  });

  it("ngOnDestroy llama a desconectar del servicio terminal", function() {
    crearComponente();
    componente.ngOnDestroy();
    expect(terminalServiceMock.desconectar).toHaveBeenCalled();
  });

  it("ngOnDestroy desuscribe la subscripción de datos si existe", function() {
    crearComponente();
    const suscripcionFalsa = new Subscription();
    const espia = spyOn(suscripcionFalsa, "unsubscribe");
    (componente as unknown as { suscripcionDatos: Subscription }).suscripcionDatos = suscripcionFalsa;
    componente.ngOnDestroy();
    expect(espia).toHaveBeenCalled();
  });

  it("ngOnDestroy dispone del terminal cuando existe", function() {
    crearComponente();
    const terminalFalso = { dispose: jasmine.createSpy("dispose") };
    (componente as unknown as { terminal: { dispose: jasmine.Spy } }).terminal = terminalFalso;
    componente.ngOnDestroy();
    expect(terminalFalso.dispose).toHaveBeenCalled();
  });

  it("ngOnDestroy elimina el listener de resize si existe", function() {
    crearComponente();
    const manejadorFalso = function() {};
    (componente as unknown as { manejadorRedimensionar: () => void }).manejadorRedimensionar = manejadorFalso;
    const espia = spyOn(window, "removeEventListener");
    componente.ngOnDestroy();
    expect(espia).toHaveBeenCalledWith("resize", manejadorFalso);
  });

  it("ngOnDestroy no falla cuando no hay subs ni terminal", function() {
    crearComponente();
    expect(function() { componente.ngOnDestroy(); }).not.toThrow();
  });
});
