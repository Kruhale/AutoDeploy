import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting, HttpTestingController } from "@angular/common/http/testing";
import { AsistenteIaService, MensajeChat } from "./asistente-ia.service";

describe("AsistenteIaService", function() {
  let servicio: AsistenteIaService;
  let http: HttpTestingController;

  beforeEach(function() {
    TestBed.configureTestingModule({
      providers: [
        AsistenteIaService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    servicio = TestBed.inject(AsistenteIaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(function() {
    http.verify();
  });

  it("se crea con historial vacio", function() {
    expect(servicio).toBeTruthy();
    expect(servicio.historialMensajes()).toEqual([]);
    expect(servicio.estaEscribiendo()).toBeFalse();
  });

  it("enviarMensaje: POST y resuelve con la RespuestaChatIa", async function() {
    const promesa = servicio.enviarMensaje("u-1", "s-1", "hola");

    const req = http.expectOne("/api/asistente-ia/mensaje");
    expect(req.request.method).toBe("POST");
    expect(req.request.body.usuarioId).toBe("u-1");
    expect(req.request.body.servidorId).toBe("s-1");
    expect(req.request.body.mensaje).toBe("hola");

    req.flush({
      success: true,
      message: "OK",
      data: { respuesta: "Hola", comandoPropuesto: "", razonamiento: "", requiereConfirmacion: false, salidaComandoAutoEjecutado: null }
    });

    const resp = await promesa;
    expect(resp.respuesta).toBe("Hola");
  });

  it("enviarMensaje: rechaza si success=false con el mensaje", async function() {
    const promesa = servicio.enviarMensaje("u-1", "s-1", "x");
    http.expectOne("/api/asistente-ia/mensaje").flush({ success: false, message: "Sin API key", data: null });

    await expectAsync(promesa).toBeRejectedWithError("Sin API key");
  });

  it("enviarMensaje: rechaza con el mensaje del backend si la peticion falla", async function() {
    const promesa = servicio.enviarMensaje("u-1", "s-1", "x");
    http.expectOne("/api/asistente-ia/mensaje").error(new ProgressEvent("network"), { status: 500, statusText: "boom" });

    await expectAsync(promesa).toBeRejected();
  });

  it("enviarMensaje: incluye el historial formateado en el body", async function() {
    const mensajePrevio: MensajeChat = { rol: "user", contenido: "previo" };
    servicio.agregarMensaje(mensajePrevio);

    const promesa = servicio.enviarMensaje("u-1", "s-1", "hola");
    const req = http.expectOne("/api/asistente-ia/mensaje");
    expect(req.request.body.historial.length).toBe(1);
    expect(req.request.body.historial[0]).toEqual({ rol: "user", contenido: "previo" });
    req.flush({
      success: true,
      message: "OK",
      data: { respuesta: "ok", comandoPropuesto: "", razonamiento: "", requiereConfirmacion: false, salidaComandoAutoEjecutado: null }
    });
    await promesa;
  });

  it("ejecutarComandoConfirmado: POST y devuelve la salida", async function() {
    const promesa = servicio.ejecutarComandoConfirmado("s-1", "ls");

    const req = http.expectOne("/api/asistente-ia/ejecutar");
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({ servidorId: "s-1", comando: "ls" });

    req.flush({ success: true, message: "OK", data: { salida: "total 0" } });

    const salida = await promesa;
    expect(salida).toBe("total 0");
  });

  it("ejecutarComandoConfirmado: rechaza si success=false", async function() {
    const promesa = servicio.ejecutarComandoConfirmado("s-1", "ls");
    http.expectOne("/api/asistente-ia/ejecutar").flush({ success: false, message: "Comando prohibido", data: null });

    await expectAsync(promesa).toBeRejectedWithError("Comando prohibido");
  });

  it("ejecutarComandoConfirmado: rechaza si la peticion falla", async function() {
    const promesa = servicio.ejecutarComandoConfirmado("s-1", "ls");
    http.expectOne("/api/asistente-ia/ejecutar").error(new ProgressEvent("network"), { status: 500, statusText: "boom" });

    await expectAsync(promesa).toBeRejected();
  });

  it("obtenerConfiguracion: GET por usuario y devuelve la config", async function() {
    const promesa = servicio.obtenerConfiguracion("u-1");

    const req = http.expectOne("/api/asistente-ia/configuracion/u-1");
    expect(req.request.method).toBe("GET");
    req.flush({
      success: true,
      message: "OK",
      data: { apiKeyConfigurada: true, modeloPreferido: "modelo-1", comandosAutoAprobados: ["ls"] }
    });

    const config = await promesa;
    expect(config.apiKeyConfigurada).toBeTrue();
    expect(config.modeloPreferido).toBe("modelo-1");
  });

  it("obtenerConfiguracion: rechaza si success=false", async function() {
    const promesa = servicio.obtenerConfiguracion("u-1");
    http.expectOne("/api/asistente-ia/configuracion/u-1").flush({ success: false, message: "Sin permisos", data: null });

    await expectAsync(promesa).toBeRejectedWithError("Sin permisos");
  });

  it("obtenerConfiguracion: rechaza si la peticion falla", async function() {
    const promesa = servicio.obtenerConfiguracion("u-1");
    http.expectOne("/api/asistente-ia/configuracion/u-1").error(new ProgressEvent("network"), { status: 500, statusText: "boom" });

    await expectAsync(promesa).toBeRejected();
  });

  it("actualizarConfiguracion: PUT con el cuerpo dado", async function() {
    const promesa = servicio.actualizarConfiguracion("u-1", { apiKey: "sk-xxx" });

    const req = http.expectOne("/api/asistente-ia/configuracion/u-1");
    expect(req.request.method).toBe("PUT");
    expect(req.request.body).toEqual({ apiKey: "sk-xxx" });

    req.flush({
      success: true,
      message: "OK",
      data: { apiKeyConfigurada: true, modeloPreferido: "modelo-1", comandosAutoAprobados: [] }
    });

    const config = await promesa;
    expect(config.apiKeyConfigurada).toBeTrue();
  });

  it("actualizarConfiguracion: rechaza si success=false", async function() {
    const promesa = servicio.actualizarConfiguracion("u-1", { apiKey: "sk" });
    http.expectOne("/api/asistente-ia/configuracion/u-1").flush({ success: false, message: "Datos invalidos", data: null });

    await expectAsync(promesa).toBeRejectedWithError("Datos invalidos");
  });

  it("actualizarConfiguracion: rechaza si la peticion falla", async function() {
    const promesa = servicio.actualizarConfiguracion("u-1", { apiKey: "sk" });
    http.expectOne("/api/asistente-ia/configuracion/u-1").error(new ProgressEvent("network"), { status: 500, statusText: "boom" });

    await expectAsync(promesa).toBeRejected();
  });

  it("agregarMensaje: lo añade al historial", function() {
    const mensaje: MensajeChat = { rol: "user", contenido: "test" };
    servicio.agregarMensaje(mensaje);

    expect(servicio.historialMensajes().length).toBe(1);
    expect(servicio.historialMensajes()[0].contenido).toBe("test");
  });

  it("actualizarUltimoMensaje: aplica cambios al ultimo mensaje", function() {
    servicio.agregarMensaje({ rol: "assistant", contenido: "pensando" });
    servicio.actualizarUltimoMensaje({ contenido: "respondido", estadoComando: "ejecutado" });

    const ultimo = servicio.historialMensajes()[0];
    expect(ultimo.contenido).toBe("respondido");
    expect(ultimo.estadoComando).toBe("ejecutado");
  });

  it("actualizarUltimoMensaje: no falla con historial vacio", function() {
    servicio.actualizarUltimoMensaje({ contenido: "nada" });
    expect(servicio.historialMensajes().length).toBe(0);
  });

  it("limpiarHistorial: vacia el array de mensajes", function() {
    servicio.agregarMensaje({ rol: "user", contenido: "a" });
    servicio.agregarMensaje({ rol: "assistant", contenido: "b" });
    servicio.limpiarHistorial();

    expect(servicio.historialMensajes()).toEqual([]);
  });

  it("enviarMensaje: rechaza con mensaje por defecto si error sin body", async function() {
    const promesa = servicio.enviarMensaje("u", "s", "m");
    http.expectOne("/api/asistente-ia/mensaje").error(new ProgressEvent("net"));

    await expectAsync(promesa).toBeRejectedWithError("Error al hablar con el asistente");
  });
});
