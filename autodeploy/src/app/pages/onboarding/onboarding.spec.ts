import { ComponentFixture, TestBed, fakeAsync, tick } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting, HttpTestingController } from "@angular/common/http/testing";
import { Router } from "@angular/router";
import { provideRouter } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import { Onboarding } from "./onboarding";

describe("Onboarding", function() {
  let component: Onboarding;
  let fixture: ComponentFixture<Onboarding>;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async function() {
    await TestBed.configureTestingModule({
      imports: [Onboarding, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Onboarding);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  afterEach(function() {
    httpMock.verify();
  });

  it("debe crear el componente", function() {
    expect(component).toBeTruthy();
  });

  it("usa key como metodo de autenticacion por defecto", function() {
    expect(component.metodoAutenticacion()).toBe("key");
  });

  it("inicializa puerto SSH a 22 y usuario a root", function() {
    expect(component.puertoSsh()).toBe("22");
    expect(component.usuarioSsh()).toBe("root");
  });

  it("inicia con estado de conexion waiting", function() {
    expect(component.estadoConexion()).toBe("waiting");
    expect(component.conectando()).toBeFalse();
  });

  it("inicia con campos de servidor vacios", function() {
    expect(component.nombreServidor()).toBe("");
    expect(component.direccionIp()).toBe("");
    expect(component.passwordServidor()).toBe("");
    expect(component.claveSshPrivada()).toBe("");
  });

  it("permite cambiar a metodo password", function() {
    component.metodoAutenticacion.set("password");
    expect(component.metodoAutenticacion()).toBe("password");
  });

  it("cambiarMetodoAuth actualiza el signal a password", function() {
    component.cambiarMetodoAuth("password");
    expect(component.metodoAutenticacion()).toBe("password");
  });

  it("cambiarMetodoAuth puede volver a key", function() {
    component.cambiarMetodoAuth("password");
    component.cambiarMetodoAuth("key");
    expect(component.metodoAutenticacion()).toBe("key");
  });

  it("conectarServidor sin nombre marca estado error y no llama backend", function() {
    component.nombreServidor.set("");
    component.direccionIp.set("1.2.3.4");
    component.conectarServidor();
    expect(component.estadoConexion()).toBe("error");
    expect(component.conectando()).toBeFalse();
    httpMock.expectNone("/api/servidores");
  });

  it("conectarServidor sin ip marca estado error", function() {
    component.nombreServidor.set("Servidor");
    component.direccionIp.set("");
    component.conectarServidor();
    expect(component.estadoConexion()).toBe("error");
    httpMock.expectNone("/api/servidores");
  });

  it("conectarServidor exitoso navega a terminal con id devuelto", fakeAsync(function() {
    spyOn(router, "navigate");
    component.nombreServidor.set("Servidor Demo");
    component.direccionIp.set("10.0.0.1");
    component.puertoSsh.set("2222");
    component.usuarioSsh.set("alex");
    component.metodoAutenticacion.set("password");
    component.passwordServidor.set("clave");
    component.claveSshPrivada.set("");

    component.conectarServidor();
    expect(component.estadoConexion()).toBe("testing");
    expect(component.conectando()).toBeTrue();

    const peticion = httpMock.expectOne("/api/servidores");
    expect(peticion.request.method).toBe("POST");
    expect(peticion.request.body.puertoSsh).toBe(2222);
    expect(peticion.request.body.usuarioSsh).toBe("alex");
    expect(peticion.request.body.metodoAutenticacion).toBe("password");

    peticion.flush({
      success: true,
      message: "OK",
      data: {
        id: "srv-1",
        nombre: "Servidor Demo",
        direccionIp: "10.0.0.1",
        puertoSsh: 2222,
        usuarioSsh: "alex",
        metodoAutenticacion: "password",
        estado: "conectado",
        fechaCreacion: "2026-05-22"
      }
    });
    tick();
    expect(component.estadoConexion()).toBe("success");
    expect(component.conectando()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(["/app/terminal", "srv-1"]);
  }));

  it("conectarServidor con error HTTP marca estado error", fakeAsync(function() {
    component.nombreServidor.set("Servidor");
    component.direccionIp.set("10.0.0.1");
    component.conectarServidor();

    const peticion = httpMock.expectOne("/api/servidores");
    peticion.error(new ProgressEvent("network"), { status: 500, statusText: "fail" });
    tick();

    expect(component.estadoConexion()).toBe("error");
    expect(component.conectando()).toBeFalse();
  }));
});
