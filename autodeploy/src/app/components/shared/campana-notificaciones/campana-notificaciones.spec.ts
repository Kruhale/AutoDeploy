import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { provideRouter } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import { signal } from "@angular/core";
import { Subject } from "rxjs";
import { CampanaNotificaciones } from "./campana-notificaciones";
import { NotificacionService, Notificacion } from "../../../services/notificacion.service";
import { UsuarioService } from "../../../services/usuario.service";

function crearNotificacionServiceFake() {
  const notificacionesDelUsuario = signal<Notificacion[]>([]);
  const notificacionesNoLeidas = signal<Notificacion[]>([]);
  const conteoNoLeidas = signal(0);
  const sujetoRecibidas = new Subject<Notificacion>();

  return {
    notificacionesDelUsuario: notificacionesDelUsuario,
    notificacionesNoLeidas: notificacionesNoLeidas,
    conteoNoLeidas: conteoNoLeidas,
    conectarWebSocket: jasmine.createSpy("conectarWebSocket"),
    desconectarWebSocket: jasmine.createSpy("desconectarWebSocket"),
    obtenerNotificacionesRecibidas: function() {
      return sujetoRecibidas.asObservable();
    },
    obtenerConteoNoLeidas: jasmine.createSpy("obtenerConteoNoLeidas").and.returnValue(Promise.resolve(0)),
    listarNoLeidas: jasmine.createSpy("listarNoLeidas").and.returnValue(Promise.resolve([])),
    marcarComoLeida: jasmine.createSpy("marcarComoLeida").and.returnValue(Promise.resolve()),
    marcarTodasComoLeidas: jasmine.createSpy("marcarTodasComoLeidas").and.returnValue(Promise.resolve()),
    eliminarNotificacion: jasmine.createSpy("eliminarNotificacion").and.returnValue(Promise.resolve())
  };
}

describe("CampanaNotificaciones", function() {
  let fixture: ComponentFixture<CampanaNotificaciones>;
  let componente: CampanaNotificaciones;
  let notificacionFake: ReturnType<typeof crearNotificacionServiceFake>;
  let usuarioService: UsuarioService;

  beforeEach(async function() {
    sessionStorage.clear();
    notificacionFake = crearNotificacionServiceFake();

    await TestBed.configureTestingModule({
      imports: [CampanaNotificaciones, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NotificacionService, useValue: notificacionFake }
      ]
    }).compileComponents();

    usuarioService = TestBed.inject(UsuarioService);
    fixture = TestBed.createComponent(CampanaNotificaciones);
    componente = fixture.componentInstance;
  });

  afterEach(function() {
    sessionStorage.clear();
  });

  it("debe crear el componente", function() {
    expect(componente).toBeTruthy();
  });

  it("campanAbierta arranca en falso", function() {
    expect(componente.campanAbierta()).toBeFalse();
  });

  it("alternarCampana invierte el estado de la señal", function() {
    componente.alternarCampana();
    expect(componente.campanAbierta()).toBeTrue();
    componente.alternarCampana();
    expect(componente.campanAbierta()).toBeFalse();
  });

  it("cerrarCampana pone la señal en falso", function() {
    componente.alternarCampana();
    expect(componente.campanAbierta()).toBeTrue();
    componente.cerrarCampana();
    expect(componente.campanAbierta()).toBeFalse();
  });

  it("ngOnInit con usuario carga notificaciones y conecta WebSocket", async function() {
    usuarioService.usuarioId.set("usuario-321");

    componente.ngOnInit();
    await fixture.whenStable();

    expect(notificacionFake.obtenerConteoNoLeidas).toHaveBeenCalledWith("usuario-321");
    expect(notificacionFake.listarNoLeidas).toHaveBeenCalledWith("usuario-321");
    expect(notificacionFake.conectarWebSocket).toHaveBeenCalledWith("usuario-321");
  });

  it("ngOnInit sin usuario no llama a los métodos del servicio", function() {
    usuarioService.usuarioId.set("");

    componente.ngOnInit();

    expect(notificacionFake.obtenerConteoNoLeidas).not.toHaveBeenCalled();
    expect(notificacionFake.conectarWebSocket).not.toHaveBeenCalled();
  });

  it("ngOnDestroy desconecta el WebSocket", function() {
    componente.ngOnDestroy();
    expect(notificacionFake.desconectarWebSocket).toHaveBeenCalled();
  });

  it("marcarComoLeida delega en el servicio con el id correcto", async function() {
    await componente.marcarComoLeida("notif-1");
    expect(notificacionFake.marcarComoLeida).toHaveBeenCalledWith("notif-1");
  });

  it("marcarComoLeida captura errores del servicio", async function() {
    notificacionFake.marcarComoLeida.and.returnValue(Promise.reject(new Error("fallo")));
    spyOn(console, "error");

    await componente.marcarComoLeida("notif-1");

    expect(console.error).toHaveBeenCalled();
  });

  it("marcarTodasComoLeidas con usuario delega en el servicio", async function() {
    usuarioService.usuarioId.set("usuario-555");
    await componente.marcarTodasComoLeidas();
    expect(notificacionFake.marcarTodasComoLeidas).toHaveBeenCalledWith("usuario-555");
  });

  it("marcarTodasComoLeidas sin usuario no hace nada", async function() {
    usuarioService.usuarioId.set("");
    await componente.marcarTodasComoLeidas();
    expect(notificacionFake.marcarTodasComoLeidas).not.toHaveBeenCalled();
  });

  it("marcarTodasComoLeidas captura errores del servicio", async function() {
    usuarioService.usuarioId.set("usuario-555");
    notificacionFake.marcarTodasComoLeidas.and.returnValue(Promise.reject(new Error("fallo")));
    spyOn(console, "error");

    await componente.marcarTodasComoLeidas();

    expect(console.error).toHaveBeenCalled();
  });

  it("eliminarNotificacion delega en el servicio con el id correcto", async function() {
    await componente.eliminarNotificacion("notif-99");
    expect(notificacionFake.eliminarNotificacion).toHaveBeenCalledWith("notif-99");
  });

  it("eliminarNotificacion captura errores del servicio", async function() {
    notificacionFake.eliminarNotificacion.and.returnValue(Promise.reject(new Error("fallo")));
    spyOn(console, "error");

    await componente.eliminarNotificacion("notif-99");

    expect(console.error).toHaveBeenCalled();
  });

  it("obtenerIconoPorTipo devuelve el icono correspondiente", function() {
    expect(componente.obtenerIconoPorTipo("servidor_desconectado")).toBe("fa-server");
    expect(componente.obtenerIconoPorTipo("deployment")).toBe("fa-rocket");
    expect(componente.obtenerIconoPorTipo("error_critico")).toBe("fa-triangle-exclamation");
    expect(componente.obtenerIconoPorTipo("ssl_vencido")).toBe("fa-shield");
    expect(componente.obtenerIconoPorTipo("cambio_configuracion")).toBe("fa-gear");
  });

  it("obtenerIconoPorTipo devuelve fa-bell para tipos desconocidos", function() {
    expect(componente.obtenerIconoPorTipo("desconocido")).toBe("fa-bell");
  });

  it("alClickFueraDelPanel no hace nada cuando la campana esta cerrada", function() {
    spyOn(componente, "cerrarCampana");
    const evento = new MouseEvent("click");

    componente.alClickFueraDelPanel(evento);

    expect(componente.cerrarCampana).not.toHaveBeenCalled();
  });

  it("alClickFueraDelPanel cierra la campana al clicar fuera", function() {
    componente.alternarCampana();
    spyOn(componente, "cerrarCampana");
    const elementoExterno = document.createElement("section");
    const evento = { target: elementoExterno } as unknown as MouseEvent;

    componente.alClickFueraDelPanel(evento);

    expect(componente.cerrarCampana).toHaveBeenCalled();
  });

  it("alClickFueraDelPanel no cierra al clicar dentro del componente", function() {
    componente.alternarCampana();
    fixture.detectChanges();
    spyOn(componente, "cerrarCampana");
    const elementoInterno = fixture.nativeElement.querySelector("button");
    const evento = { target: elementoInterno } as unknown as MouseEvent;

    componente.alClickFueraDelPanel(evento);

    expect(componente.cerrarCampana).not.toHaveBeenCalled();
  });
});
