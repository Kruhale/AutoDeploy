import { TestBed } from "@angular/core/testing";
import { HttpClientTestingModule, HttpTestingController } from "@angular/common/http/testing";
import { TranslateModule } from "@ngx-translate/core";
import { UsuarioService } from "./usuario.service";

describe("UsuarioService", function() {
  let servicio: UsuarioService;
  let httpMock: HttpTestingController;

  beforeEach(function() {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, TranslateModule.forRoot()],
      providers: [UsuarioService]
    });
    servicio = TestBed.inject(UsuarioService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(function() {
    httpMock.verify();
    sessionStorage.clear();
  });

  it("debe crear el servicio", function() {
    expect(servicio).toBeTruthy();
  });

  it("debe inicializar señales desde sessionStorage vacío", function() {
    expect(servicio.usuarioId()).toBe("");
    expect(servicio.plan()).toBe("free");
  });

  it("login OK debe guardar datos en sessionStorage y poblar señales", async function() {
    // valor de ejemplo de test (no es una credencial real)
    const claveEjemplo = "valor-test-1234";
    const promesaLogin = servicio.login("test@test.com", claveEjemplo);

    const peticion = httpMock.expectOne("/api/usuarios/login");
    expect(peticion.request.method).toBe("POST");
    expect(peticion.request.body).toEqual({ email: "test@test.com", password: claveEjemplo });

    peticion.flush({
      success: true,
      message: "OK",
      data: {
        id: "user-id-1",
        nombre: "Demo",
        email: "test@test.com",
        token: "jwt-token-xxx",
        plan: "pro",
        fechaFinSuscripcion: null,
        idioma: "es"
      }
    });

    const datos = await promesaLogin;
    expect(datos.id).toBe("user-id-1");
    expect(sessionStorage.getItem("usuarioId")).toBe("user-id-1");
    expect(sessionStorage.getItem("nombre")).toBe("Demo");
    expect(sessionStorage.getItem("email")).toBe("test@test.com");
    expect(sessionStorage.getItem("plan")).toBe("pro");
    expect(servicio.plan()).toBe("pro");
  });

  it("login con success=false debe rechazar con el mensaje del backend", async function() {
    const promesaLogin = servicio.login("a@a.com", "mala");

    const peticion = httpMock.expectOne("/api/usuarios/login");
    peticion.flush({ success: false, message: "Credenciales incorrectas", data: null });

    await expectAsync(promesaLogin).toBeRejectedWithError("Credenciales incorrectas");
  });

  it("login con error HTTP debe rechazar con mensaje por defecto", async function() {
    const promesaLogin = servicio.login("a@a.com", "mala");

    const peticion = httpMock.expectOne("/api/usuarios/login");
    peticion.error(new ProgressEvent("network"), { status: 500, statusText: "Server Error" });

    await expectAsync(promesaLogin).toBeRejected();
  });

  it("registrar debe llamar a POST /api/usuarios/registro", async function() {
    // valor de ejemplo de test (no es una credencial real)
    const claveEjemplo = "valor-test-9876";
    const promesaRegistro = servicio.registrar("Nuevo", "n@n.com", claveEjemplo);

    const peticion = httpMock.expectOne("/api/usuarios/registro");
    expect(peticion.request.method).toBe("POST");
    expect(peticion.request.body).toEqual({ nombre: "Nuevo", email: "n@n.com", password: claveEjemplo });

    peticion.flush({
      success: true,
      message: "OK",
      data: { id: "u2", nombre: "Nuevo", email: "n@n.com", token: "t", plan: "free", fechaFinSuscripcion: null, idioma: "es" }
    });

    await promesaRegistro;
    expect(sessionStorage.getItem("usuarioId")).toBe("u2");
  });

  it("actualizarPlan debe llamar a PUT /api/usuarios/{id}/plan", async function() {
    const promesa = servicio.actualizarPlan("user-id-1", "business");

    const peticion = httpMock.expectOne("/api/usuarios/user-id-1/plan");
    expect(peticion.request.method).toBe("PUT");
    expect(peticion.request.body).toEqual({ plan: "business" });

    peticion.flush({
      success: true,
      message: "OK",
      data: { id: "user-id-1", nombre: "x", email: "x@x.com", token: null, plan: "business", fechaFinSuscripcion: null, idioma: "es" }
    });

    await promesa;
    expect(servicio.plan()).toBe("business");
  });

  it("cancelarSuscripcion debe llamar a PUT /api/usuarios/{id}/cancelar-suscripcion", async function() {
    servicio.usuarioId.set("user-id-1");
    const promesa = servicio.cancelarSuscripcion();

    const peticion = httpMock.expectOne("/api/usuarios/user-id-1/cancelar-suscripcion");
    expect(peticion.request.method).toBe("PUT");

    peticion.flush({
      success: true,
      message: "OK",
      data: { id: "user-id-1", nombre: "x", email: "x@x.com", token: null, plan: "free", fechaFinSuscripcion: "2026-12-31", idioma: "es" }
    });

    await promesa;
    expect(servicio.fechaFinSuscripcion()).toBe("2026-12-31");
  });

  it("actualizarPerfil debe llamar a PUT /api/usuarios/{id}", async function() {
    servicio.usuarioId.set("user-id-1");
    const promesa = servicio.actualizarPerfil("Nuevo", "nuevo@x.com");

    const peticion = httpMock.expectOne("/api/usuarios/user-id-1");
    expect(peticion.request.body).toEqual({ nombre: "Nuevo", email: "nuevo@x.com" });

    peticion.flush({
      success: true,
      message: "OK",
      data: { id: "user-id-1", nombre: "Nuevo", email: "nuevo@x.com", token: null, plan: "pro", fechaFinSuscripcion: null, idioma: "es" }
    });

    await promesa;
    expect(servicio.nombre()).toBe("Nuevo");
    expect(servicio.email()).toBe("nuevo@x.com");
  });

  it("listarClavesSsh: GET /api/usuarios/{id}/claves-ssh devuelve el array data", async function() {
    servicio.usuarioId.set("user-id-1");
    const promesa = servicio.listarClavesSsh();

    const peticion = httpMock.expectOne("/api/usuarios/user-id-1/claves-ssh");
    expect(peticion.request.method).toBe("GET");
    peticion.flush({ success: true, message: "OK", data: [{ id: "k-1", nombre: "k1", huella: "h", fechaCreacion: "x" }] });

    const claves = await promesa;
    expect(claves.length).toBe(1);
    expect(claves[0].nombre).toBe("k1");
  });

  it("agregarClaveSsh: POST con nombre y claveCompleta", async function() {
    servicio.usuarioId.set("user-id-1");
    const promesa = servicio.agregarClaveSsh("nueva", "ssh-rsa AAAA");

    const peticion = httpMock.expectOne("/api/usuarios/user-id-1/claves-ssh");
    expect(peticion.request.method).toBe("POST");
    expect(peticion.request.body).toEqual({ nombre: "nueva", claveCompleta: "ssh-rsa AAAA" });
    peticion.flush({ success: true, message: "OK", data: { id: "k-1", nombre: "nueva", huella: "h", fechaCreacion: "x" } });

    const clave = await promesa;
    expect(clave.id).toBe("k-1");
  });

  it("eliminarClaveSsh: DELETE en /api/usuarios/{id}/claves-ssh/{idClave}", async function() {
    servicio.usuarioId.set("user-id-1");
    const promesa = servicio.eliminarClaveSsh("k-1");

    const peticion = httpMock.expectOne("/api/usuarios/user-id-1/claves-ssh/k-1");
    expect(peticion.request.method).toBe("DELETE");
    peticion.flush({});

    await promesa;
  });

  it("obtenerPreferenciasNotificacion: GET en /api/usuarios/{id}/notificaciones", async function() {
    servicio.usuarioId.set("user-id-1");
    const promesa = servicio.obtenerPreferenciasNotificacion();

    const peticion = httpMock.expectOne("/api/usuarios/user-id-1/notificaciones");
    peticion.flush({ success: true, message: "OK", data: { email: true, alertasCriticas: true, eventosDespliegue: false } });

    const prefs = await promesa;
    expect(prefs.email).toBeTrue();
    expect(prefs.eventosDespliegue).toBeFalse();
  });

  it("guardarPreferenciasNotificacion: PUT con el body de preferencias", async function() {
    servicio.usuarioId.set("user-id-1");
    const promesa = servicio.guardarPreferenciasNotificacion({ email: false, alertasCriticas: true, eventosDespliegue: false });

    const peticion = httpMock.expectOne("/api/usuarios/user-id-1/notificaciones");
    expect(peticion.request.method).toBe("PUT");
    expect(peticion.request.body).toEqual({ email: false, alertasCriticas: true, eventosDespliegue: false });
    peticion.flush({});

    await promesa;
  });

  it("limpiar: vacia sessionStorage y resetea signals", function() {
    sessionStorage.setItem("token", "abc");
    servicio.usuarioId.set("u-1");
    servicio.plan.set("pro");

    servicio.limpiar();

    expect(servicio.usuarioId()).toBe("");
    expect(servicio.plan()).toBe("free");
    expect(sessionStorage.getItem("token")).toBeNull();
    expect(sessionStorage.getItem("usuarioId")).toBeNull();
  });

  it("registrar con success=false rechaza con el mensaje del backend", async function() {
    const promesa = servicio.registrar("X", "x@x.com", "p");
    const peticion = httpMock.expectOne("/api/usuarios/registro");
    peticion.flush({ success: false, message: "Email duplicado", data: null });

    await expectAsync(promesa).toBeRejectedWithError("Email duplicado");
  });
});
