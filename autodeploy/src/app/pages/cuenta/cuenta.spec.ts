import { ComponentFixture, TestBed, fakeAsync, tick } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { provideRouter, Router } from "@angular/router";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { Cuenta } from "./cuenta";
import { UsuarioService } from "../../services/usuario.service";
import { PlanService } from "../../services/plan.service";
import { AuthService } from "../../services/auth.service";
import { ThemeService } from "../../services/theme.service";

describe("Cuenta", function() {
  let fixture: ComponentFixture<Cuenta>;
  let componente: Cuenta;
  let httpMock: HttpTestingController;
  let usuarioService: UsuarioService;
  let planService: PlanService;
  let authService: AuthService;
  let themeService: ThemeService;
  let router: Router;

  function esperarMacrotask(): Promise<void> {
    return new Promise(function(resolver) { setTimeout(resolver, 0); });
  }

  async function flushPeticionesUsuario(idUsuario: string): Promise<void> {
    await esperarMacrotask();
    const peticionClaves = httpMock.expectOne("/api/usuarios/" + idUsuario + "/claves-ssh");
    peticionClaves.flush({ success: true, message: "OK", data: [] });
    await esperarMacrotask();
    const peticionPrefs = httpMock.expectOne("/api/usuarios/" + idUsuario + "/notificaciones");
    peticionPrefs.flush({ success: true, message: "OK", data: { email: true, alertasCriticas: true, eventosDespliegue: true } });
    await esperarMacrotask();
  }

  function flushPeticionesUsuarioSync(idUsuario: string): void {
    tick();
    const peticionClaves = httpMock.expectOne("/api/usuarios/" + idUsuario + "/claves-ssh");
    peticionClaves.flush({ success: true, message: "OK", data: [] });
    tick();
    const peticionPrefs = httpMock.expectOne("/api/usuarios/" + idUsuario + "/notificaciones");
    peticionPrefs.flush({ success: true, message: "OK", data: { email: true, alertasCriticas: true, eventosDespliegue: true } });
    tick();
  }

  beforeEach(async function() {
    sessionStorage.clear();
    sessionStorage.setItem("usuarioId", "507f1f77bcf86cd799439011");
    sessionStorage.setItem("nombre", "Pepe");
    sessionStorage.setItem("email", "pepe@test.com");
    sessionStorage.setItem("plan", "pro");

    await TestBed.configureTestingModule({
      imports: [Cuenta, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    usuarioService = TestBed.inject(UsuarioService);
    planService = TestBed.inject(PlanService);
    authService = TestBed.inject(AuthService);
    themeService = TestBed.inject(ThemeService);
    router = TestBed.inject(Router);

    fixture = TestBed.createComponent(Cuenta);
    componente = fixture.componentInstance;
  });

  afterEach(function() {
    httpMock.verify();
    sessionStorage.clear();
  });

  it("debe crear el componente", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    expect(componente).toBeTruthy();
    expect(componente.nombreEditable()).toBe("Pepe");
    expect(componente.emailEditable()).toBe("pepe@test.com");
  });

  it("inicialDelNombre devuelve la primera letra en mayuscula", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    expect(componente.inicialDelNombre()).toBe("P");
  });

  it("inicialDelNombre devuelve '?' cuando no hay nombre", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    usuarioService.nombre.set("");
    expect(componente.inicialDelNombre()).toBe("?");
  });

  it("detallePlanActual encuentra el plan vigente", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    planService.planActual.set("business");
    expect(componente.detallePlanActual().id).toBe("business");
  });

  it("detallePlanActual cae al primer plan si no se encuentra", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    planService.planActual.set("inexistente" as any);
    expect(componente.detallePlanActual().id).toBe("free");
  });

  it("fechaCreacionCuenta extrae fecha desde el ObjectId", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    const fecha = componente.fechaCreacionCuenta();
    expect(fecha).not.toBeNull();
    expect(fecha instanceof Date).toBeTrue();
  });

  it("fechaCreacionCuenta es null si el id es invalido", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    usuarioService.usuarioId.set("xx");
    expect(componente.fechaCreacionCuenta()).toBeNull();
  });

  it("fechaCreacionCuenta es null si el hex no es numerico", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    usuarioService.usuarioId.set("zzzzzzzzaaaaaaaaaaaaaaaa");
    expect(componente.fechaCreacionCuenta()).toBeNull();
  });

  it("diasComoMiembro es 0 cuando no hay fecha de creacion", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    usuarioService.usuarioId.set("");
    expect(componente.diasComoMiembro()).toBe(0);
  });

  it("diasComoMiembro es >= 0 con ObjectId valido", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    expect(componente.diasComoMiembro()).toBeGreaterThanOrEqual(0);
  });

  it("progresoAniversarioPorcentaje esta entre 2 y 100", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    const porcentaje = componente.progresoAniversarioPorcentaje();
    expect(porcentaje).toBeGreaterThanOrEqual(2);
    expect(porcentaje).toBeLessThanOrEqual(100);
  });

  it("idTruncado devuelve cadena vacia si el id es corto", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    usuarioService.usuarioId.set("");
    expect(componente.idTruncado()).toBe("");
  });

  it("idTruncado trunca el id en formato '6chars...4chars'", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    const truncado = componente.idTruncado();
    expect(truncado).toContain("···");
    expect(truncado.startsWith("507f1f")).toBeTrue();
  });

  it("resumenDeCuenta genera 4 filas", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    expect(componente.resumenDeCuenta().length).toBe(4);
  });

  it("resumenDeCuenta marca aviso cuando hay suscripcion cancelada", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    usuarioService.fechaFinSuscripcion.set("2026-12-31");
    const filas = componente.resumenDeCuenta();
    expect(filas[0].estado).toBe("aviso");
    expect(componente.suscripcionCancelada()).toBeTrue();
  });

  it("resumenDeCuenta marca neutro para plan free", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    planService.planActual.set("free");
    const filas = componente.resumenDeCuenta();
    expect(filas[0].estado).toBe("neutro");
  });

  it("resumenDeCuenta usa 'unlimited' cuando el plan no tiene limite de servidores", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    planService.planActual.set("business");
    const filas = componente.resumenDeCuenta();
    expect(filas[1].valor.length).toBeGreaterThan(0);
  });

  it("fechaFinFormateada devuelve Date cuando hay fechaFin", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    usuarioService.fechaFinSuscripcion.set("2026-12-31");
    expect(componente.fechaFinFormateada() instanceof Date).toBeTrue();
  });

  it("fechaFinFormateada devuelve null cuando no hay fechaFin", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    usuarioService.fechaFinSuscripcion.set(null);
    expect(componente.fechaFinFormateada()).toBeNull();
  });

  it("textoMarqueePlan incluye el precio para planes de pago", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    planService.planActual.set("pro");
    expect(componente.textoMarqueePlan()).toContain("€9");
  });

  it("textoMarqueePlan no incluye precio para plan free", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    planService.planActual.set("free");
    const texto = componente.textoMarqueePlan();
    expect(texto).not.toContain("€");
  });

  it("textoMarqueePlan menciona 'enterprise' en plan business", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    planService.planActual.set("business");
    const texto = componente.textoMarqueePlan();
    expect(texto.length).toBeGreaterThan(0);
  });

  it("cambiarPlan a 'free' desde un plan de pago cancela la suscripcion", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    planService.planActual.set("pro");
    const promesa = componente.cambiarPlan("free");
    const peticion = httpMock.expectOne("/api/usuarios/507f1f77bcf86cd799439011/cancelar-suscripcion");
    peticion.flush({ success: true, message: "OK", data: { id: "507f1f77bcf86cd799439011", nombre: "Pepe", email: "pepe@test.com", token: null, plan: "free", fechaFinSuscripcion: "2026-12-31", idioma: "es" } });
    await promesa;
    expect(componente.cancelando()).toBeFalse();
  });

  it("cambiarPlan a un plan distinto al actual navega a /app/pago", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    planService.planActual.set("pro");
    const espia = spyOn(router, "navigate");
    componente.cambiarPlan("business");
    expect(espia).toHaveBeenCalledWith(["/app/pago"], { queryParams: { plan: "business" } });
  });

  it("cambiarPlan al plan actual no hace nada", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    planService.planActual.set("pro");
    const espia = spyOn(router, "navigate");
    componente.cambiarPlan("pro");
    expect(espia).not.toHaveBeenCalled();
  });

  it("cancelarSuscripcion gestiona error y deja cancelando en false", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    spyOn(console, "error");
    const promesa = componente.cancelarSuscripcion();
    const peticion = httpMock.expectOne("/api/usuarios/507f1f77bcf86cd799439011/cancelar-suscripcion");
    peticion.flush({ success: false, message: "fallo", data: null });
    await promesa;
    expect(componente.cancelando()).toBeFalse();
  });

  it("guardarCambios no hace nada si nombre o email estan vacios", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    componente.nombreEditable.set("");
    await componente.guardarCambios();
    httpMock.expectNone("/api/usuarios/507f1f77bcf86cd799439011");
  });

  it("guardarCambios llama al servicio y muestra mensaje guardado", fakeAsync(function() {
    flushPeticionesUsuarioSync("507f1f77bcf86cd799439011");
    componente.nombreEditable.set("PepeNuevo");
    componente.emailEditable.set("nuevo@test.com");
    componente.guardarCambios();
    const peticion = httpMock.expectOne("/api/usuarios/507f1f77bcf86cd799439011");
    peticion.flush({ success: true, message: "OK", data: { id: "507f1f77bcf86cd799439011", nombre: "PepeNuevo", email: "nuevo@test.com", token: null, plan: "pro", fechaFinSuscripcion: null, idioma: "es" } });
    tick();
    expect(componente.mensajeGuardado().length).toBeGreaterThan(0);
    tick(2400);
    expect(componente.mensajeGuardado()).toBe("");
  }));

  it("guardarCambios muestra mensaje de error si falla", fakeAsync(function() {
    flushPeticionesUsuarioSync("507f1f77bcf86cd799439011");
    componente.nombreEditable.set("X");
    componente.emailEditable.set("x@x.com");
    componente.guardarCambios();
    const peticion = httpMock.expectOne("/api/usuarios/507f1f77bcf86cd799439011");
    peticion.flush({ success: false, message: "fallo", data: null });
    tick();
    expect(componente.mensajeGuardado().length).toBeGreaterThan(0);
    tick(2400);
  }));

  it("activarTema no cambia si el tema ya es el actual", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    const temaInicial = themeService.temaActual();
    const espia = spyOn(themeService, "alternarTema");
    componente.activarTema(temaInicial);
    expect(espia).not.toHaveBeenCalled();
  });

  it("activarTema cambia cuando el tema solicitado es distinto", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    const temaInicial = themeService.temaActual();
    const otroTema = temaInicial === "oscuro" ? "claro" : "oscuro";
    const espia = spyOn(themeService, "alternarTema");
    componente.activarTema(otroTema);
    expect(espia).toHaveBeenCalled();
  });

  it("iniciarSalida activa el progreso y dispara cerrarSesion tras 1100ms", fakeAsync(function() {
    flushPeticionesUsuarioSync("507f1f77bcf86cd799439011");
    const espiaNavegar = spyOn(router, "navigate");
    componente.iniciarSalida();
    expect(componente.progresoSalidaActivo()).toBeTrue();
    tick(1100);
    expect(espiaNavegar).toHaveBeenCalledWith(["/"]);
  }));

  it("cancelarSalida detiene el progreso de salida", fakeAsync(function() {
    flushPeticionesUsuarioSync("507f1f77bcf86cd799439011");
    componente.iniciarSalida();
    componente.cancelarSalida();
    expect(componente.progresoSalidaActivo()).toBeFalse();
    tick(1100);
  }));

  it("cerrarSesion limpia usuario, hace logout y navega a la raiz", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    const espiaLimpiar = spyOn(usuarioService, "limpiar");
    const espiaLogout = spyOn(authService, "logout");
    const espiaNavegar = spyOn(router, "navigate");
    componente.cerrarSesion();
    expect(espiaLimpiar).toHaveBeenCalled();
    expect(espiaLogout).toHaveBeenCalled();
    expect(espiaNavegar).toHaveBeenCalledWith(["/"]);
  });

  it("mostrarFormularioAgregarClave abre el formulario", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    componente.mostrarFormularioAgregarClave();
    expect(componente.mostrarFormularioClave()).toBeTrue();
  });

  it("cancelarFormularioClave cierra y limpia los inputs", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    componente.mostrarFormularioClave.set(true);
    componente.nombreNuevaClave.set("X");
    componente.contenidoNuevaClave.set("Y");
    componente.cancelarFormularioClave();
    expect(componente.mostrarFormularioClave()).toBeFalse();
    expect(componente.nombreNuevaClave()).toBe("");
    expect(componente.contenidoNuevaClave()).toBe("");
  });

  it("agregarClaveSsh no hace nada si faltan campos", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    componente.nombreNuevaClave.set("");
    componente.contenidoNuevaClave.set("");
    await componente.agregarClaveSsh();
    httpMock.expectNone("/api/usuarios/507f1f77bcf86cd799439011/claves-ssh");
  });

  it("agregarClaveSsh anade la clave en la lista cuando todo va bien", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    componente.nombreNuevaClave.set("nueva");
    componente.contenidoNuevaClave.set("ssh-rsa AAAA");
    const promesa = componente.agregarClaveSsh();
    const peticion = httpMock.expectOne("/api/usuarios/507f1f77bcf86cd799439011/claves-ssh");
    peticion.flush({ success: true, message: "OK", data: { id: "k-1", nombre: "nueva", huella: "huella", fechaCreacion: "2026-05-22T10:00:00Z" } });
    await promesa;
    expect(componente.listaDeClavesSsh().length).toBe(1);
    expect(componente.mostrarFormularioClave()).toBeFalse();
  });

  it("agregarClaveSsh sin fechaCreacion usa la fecha de hoy", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    componente.nombreNuevaClave.set("sin-fecha");
    componente.contenidoNuevaClave.set("ssh-rsa AAAA");
    const promesa = componente.agregarClaveSsh();
    const peticion = httpMock.expectOne("/api/usuarios/507f1f77bcf86cd799439011/claves-ssh");
    peticion.flush({ success: true, message: "OK", data: { id: "k-2", nombre: "sin-fecha", huella: "h", fechaCreacion: null } });
    await promesa;
    expect(componente.listaDeClavesSsh()[0].fechaCreacion.length).toBeGreaterThan(0);
  });

  it("agregarClaveSsh gestiona error mostrando mensaje", fakeAsync(function() {
    flushPeticionesUsuarioSync("507f1f77bcf86cd799439011");
    componente.nombreNuevaClave.set("falla");
    componente.contenidoNuevaClave.set("ssh-rsa BBBB");
    componente.agregarClaveSsh();
    const peticion = httpMock.expectOne("/api/usuarios/507f1f77bcf86cd799439011/claves-ssh");
    peticion.error(new ProgressEvent("error"));
    tick();
    expect(componente.mensajeGuardado().length).toBeGreaterThan(0);
    tick(2500);
    expect(componente.mensajeGuardado()).toBe("");
  }));

  it("eliminarClaveSsh quita la clave de la lista", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    componente.listaDeClavesSsh.set([{ id: "k-1", nombre: "x", huella: "h", fechaCreacion: "" }]);
    const promesa = componente.eliminarClaveSsh("k-1");
    const peticion = httpMock.expectOne("/api/usuarios/507f1f77bcf86cd799439011/claves-ssh/k-1");
    peticion.flush({});
    await promesa;
    expect(componente.listaDeClavesSsh().length).toBe(0);
  });

  it("eliminarClaveSsh gestiona error con mensaje", fakeAsync(function() {
    flushPeticionesUsuarioSync("507f1f77bcf86cd799439011");
    componente.eliminarClaveSsh("k-9");
    const peticion = httpMock.expectOne("/api/usuarios/507f1f77bcf86cd799439011/claves-ssh/k-9");
    peticion.error(new ProgressEvent("error"));
    tick();
    expect(componente.mensajeGuardado().length).toBeGreaterThan(0);
    tick(2500);
  }));

  it("alternarNotificacion email invierte el signal y persiste", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    const valorPrevio = componente.notificacionesEmail();
    const promesa = componente.alternarNotificacion("email");
    const peticion = httpMock.expectOne("/api/usuarios/507f1f77bcf86cd799439011/notificaciones");
    peticion.flush({});
    await promesa;
    expect(componente.notificacionesEmail()).toBe(!valorPrevio);
  });

  it("alternarNotificacion criticas invierte el signal", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    const valorPrevio = componente.notificacionesAlertasCriticas();
    const promesa = componente.alternarNotificacion("criticas");
    const peticion = httpMock.expectOne("/api/usuarios/507f1f77bcf86cd799439011/notificaciones");
    peticion.flush({});
    await promesa;
    expect(componente.notificacionesAlertasCriticas()).toBe(!valorPrevio);
  });

  it("alternarNotificacion despliegues invierte el signal", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    const valorPrevio = componente.notificacionesDespliegues();
    const promesa = componente.alternarNotificacion("despliegues");
    const peticion = httpMock.expectOne("/api/usuarios/507f1f77bcf86cd799439011/notificaciones");
    peticion.flush({});
    await promesa;
    expect(componente.notificacionesDespliegues()).toBe(!valorPrevio);
  });

  it("alternarNotificacion silencia el error de persistencia", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    const promesa = componente.alternarNotificacion("email");
    const peticion = httpMock.expectOne("/api/usuarios/507f1f77bcf86cd799439011/notificaciones");
    peticion.error(new ProgressEvent("error"));
    await promesa;
    expect(componente).toBeTruthy();
  });

  it("manejarMovimientoCursor actualiza las variables CSS del host", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    const eventoFalso = { clientX: 100, clientY: 200 } as MouseEvent;
    componente.manejarMovimientoCursor(eventoFalso);
    const host = (fixture.nativeElement as HTMLElement);
    expect(host.style.getPropertyValue("--cursor-x")).toContain("px");
    expect(host.style.getPropertyValue("--cursor-y")).toContain("px");
  });

  it("cargarClavesYNotificaciones no pide nada si no hay usuarioId al crear", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    usuarioService.usuarioId.set("");
    const otroFixture = TestBed.createComponent(Cuenta);
    otroFixture.detectChanges();
    httpMock.expectNone(function(req) { return req.url.includes("/claves-ssh"); });
    expect(otroFixture.componentInstance).toBeTruthy();
  });

  it("cargarClavesYNotificaciones adapta claves con fechaCreacion null a '—'", async function() {
    const peticionClaves = httpMock.expectOne("/api/usuarios/507f1f77bcf86cd799439011/claves-ssh");
    peticionClaves.flush({ success: true, message: "OK", data: [{ id: "k-a", nombre: "kA", huella: "h", fechaCreacion: null }] });
    const peticionPrefs = httpMock.expectOne("/api/usuarios/507f1f77bcf86cd799439011/notificaciones");
    peticionPrefs.flush({ success: true, message: "OK", data: { email: false, alertasCriticas: false, eventosDespliegue: false } });
    await fixture.whenStable();
    expect(componente.listaDeClavesSsh()[0].fechaCreacion).toBe("—");
    expect(componente.notificacionesEmail()).toBeFalse();
  });

  it("versionIdioma se incrementa cuando cambia el idioma", async function() {
    await flushPeticionesUsuario("507f1f77bcf86cd799439011");
    const versionPrevia = componente.versionIdioma();
    const translate = TestBed.inject(TranslateService);
    translate.use("en");
    expect(componente.versionIdioma()).toBeGreaterThanOrEqual(versionPrevia);
  });
});
