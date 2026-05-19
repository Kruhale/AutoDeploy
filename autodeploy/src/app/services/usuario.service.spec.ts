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
});
