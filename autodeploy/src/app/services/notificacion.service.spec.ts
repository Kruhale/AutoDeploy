import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting, HttpTestingController } from "@angular/common/http/testing";
import { NotificacionService, Notificacion } from "./notificacion.service";

describe("NotificacionService", function() {
  let service: NotificacionService;
  let http: HttpTestingController;

  beforeEach(function() {
    TestBed.configureTestingModule({
      providers: [
        NotificacionService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(NotificacionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(function() {
    http.verify();
  });

  function notif(id: string, leida = false): Notificacion {
    return {
      id,
      tipo: "info",
      titulo: "T-" + id,
      descripcion: "D-" + id,
      leida,
      fechaCreacion: "2026-05-22T12:00:00"
    };
  }

  it("se crea correctamente", function() {
    expect(service).toBeTruthy();
    expect(service.notificacionesDelUsuario()).toEqual([]);
    expect(service.conteoNoLeidas()).toBe(0);
  });

  it("listarPorUsuario: GET y actualiza signal", async function() {
    const datos = [notif("n-1"), notif("n-2")];
    const promesa = service.listarPorUsuario("u-1");

    const req = http.expectOne("/api/notificaciones/usuario/u-1");
    expect(req.request.method).toBe("GET");
    req.flush({ success: true, message: "OK", data: datos });

    const resultado = await promesa;
    expect(resultado).toEqual(datos);
    expect(service.notificacionesDelUsuario()).toEqual(datos);
  });

  it("listarNoLeidas: GET y actualiza signal de no leidas", async function() {
    const datos = [notif("n-1", false)];
    const promesa = service.listarNoLeidas("u-1");

    const req = http.expectOne("/api/notificaciones/usuario/u-1/no-leidas");
    req.flush({ success: true, message: "OK", data: datos });

    const resultado = await promesa;
    expect(resultado.length).toBe(1);
    expect(service.notificacionesNoLeidas()).toEqual(datos);
  });

  it("obtenerConteoNoLeidas: GET y setea contador", async function() {
    const promesa = service.obtenerConteoNoLeidas("u-1");
    const req = http.expectOne("/api/notificaciones/usuario/u-1/contar-no-leidas");
    req.flush({ success: true, message: "OK", data: 5 });

    const resultado = await promesa;
    expect(resultado).toBe(5);
    expect(service.conteoNoLeidas()).toBe(5);
  });

  it("marcarComoLeida: PUT y actualiza localmente la notificacion", async function() {
    // Estado previo: dos notificaciones no leidas
    service.notificacionesDelUsuario.set([notif("n-1"), notif("n-2")]);
    service.notificacionesNoLeidas.set([notif("n-1"), notif("n-2")]);
    service.conteoNoLeidas.set(2);

    const promesa = service.marcarComoLeida("n-1");
    const req = http.expectOne("/api/notificaciones/n-1/marcar-leida");
    expect(req.request.method).toBe("PUT");
    req.flush({ success: true, message: "OK", data: null });
    await promesa;

    expect(service.notificacionesDelUsuario()[0].leida).toBeTrue();
    expect(service.notificacionesNoLeidas().length).toBe(1);
    expect(service.conteoNoLeidas()).toBe(1);
  });

  it("marcarTodasComoLeidas: PUT y deja conteo a 0", async function() {
    service.notificacionesDelUsuario.set([notif("n-1"), notif("n-2")]);
    service.notificacionesNoLeidas.set([notif("n-1"), notif("n-2")]);
    service.conteoNoLeidas.set(2);

    const promesa = service.marcarTodasComoLeidas("u-1");
    const req = http.expectOne("/api/notificaciones/usuario/u-1/marcar-todas-leidas");
    req.flush({ success: true, message: "OK", data: null });
    await promesa;

    expect(service.notificacionesDelUsuario().every(n => n.leida)).toBeTrue();
    expect(service.notificacionesNoLeidas()).toEqual([]);
    expect(service.conteoNoLeidas()).toBe(0);
  });

  it("eliminarNotificacion: DELETE y la quita de las listas locales", async function() {
    service.notificacionesDelUsuario.set([notif("n-1"), notif("n-2")]);
    service.notificacionesNoLeidas.set([notif("n-1")]);
    service.conteoNoLeidas.set(1);

    const promesa = service.eliminarNotificacion("n-1");
    const req = http.expectOne("/api/notificaciones/n-1");
    expect(req.request.method).toBe("DELETE");
    req.flush({ success: true, message: "OK", data: null });
    await promesa;

    expect(service.notificacionesDelUsuario().length).toBe(1);
    expect(service.notificacionesNoLeidas()).toEqual([]);
    expect(service.conteoNoLeidas()).toBe(0);
  });

  it("listarPorUsuario: rechaza la promesa si el endpoint devuelve error", async function() {
    const promesa = service.listarPorUsuario("u-1");
    const req = http.expectOne("/api/notificaciones/usuario/u-1");
    req.flush("kaboom", { status: 500, statusText: "Internal Server Error" });

    await expectAsync(promesa).toBeRejected();
  });

  it("desconectarWebSocket: no falla si no hay conexion abierta", function() {
    service.desconectarWebSocket();
    expect(service).toBeTruthy();
  });

  it("obtenerNotificacionesRecibidas: devuelve un Observable", function() {
    expect(service.obtenerNotificacionesRecibidas()).toBeDefined();
  });
});
