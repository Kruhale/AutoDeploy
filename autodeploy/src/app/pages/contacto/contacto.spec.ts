import { ComponentFixture, TestBed } from "@angular/core/testing";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { TranslateModule } from "@ngx-translate/core";
import { RouterTestingModule } from "@angular/router/testing";
import { Contacto } from "./contacto";

describe("Contacto", function() {
  let fixture: ComponentFixture<Contacto>;
  let componente: Contacto;

  beforeEach(async function() {
    await TestBed.configureTestingModule({
      imports: [Contacto, HttpClientTestingModule, TranslateModule.forRoot(), RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(Contacto);
    componente = fixture.componentInstance;
  });

  it("debe crear el componente", function() {
    expect(componente).toBeTruthy();
  });

  it("debe inicializar las señales con valores vacíos", function() {
    const protegido = componente as unknown as {
      nombreUsuario: () => string;
      emailUsuario: () => string;
      asuntoMensaje: () => string;
      cuerpoMensaje: () => string;
      enviado: () => boolean;
    };
    expect(protegido.nombreUsuario()).toBe("");
    expect(protegido.emailUsuario()).toBe("");
    expect(protegido.asuntoMensaje()).toBe("");
    expect(protegido.cuerpoMensaje()).toBe("");
    expect(protegido.enviado()).toBeFalse();
  });

  it("enviarPorEmail no hace nada si el asunto está vacío", function() {
    const protegido = componente as unknown as {
      asuntoMensaje: { set: (v: string) => void };
      cuerpoMensaje: { set: (v: string) => void };
      emailUsuario: { set: (v: string) => void };
      enviado: () => boolean;
    };
    protegido.asuntoMensaje.set("   ");
    protegido.cuerpoMensaje.set("hola");
    protegido.emailUsuario.set("a@a.com");

    componente.enviarPorEmail();
    expect(protegido.enviado()).toBeFalse();
  });

  it("enviarPorEmail no hace nada si el cuerpo está vacío", function() {
    const protegido = componente as unknown as {
      asuntoMensaje: { set: (v: string) => void };
      cuerpoMensaje: { set: (v: string) => void };
      emailUsuario: { set: (v: string) => void };
      enviado: () => boolean;
    };
    protegido.asuntoMensaje.set("asunto");
    protegido.cuerpoMensaje.set("");
    protegido.emailUsuario.set("a@a.com");

    componente.enviarPorEmail();
    expect(protegido.enviado()).toBeFalse();
  });

  it("enviarPorEmail no hace nada si el email está vacío", function() {
    const protegido = componente as unknown as {
      asuntoMensaje: { set: (v: string) => void };
      cuerpoMensaje: { set: (v: string) => void };
      emailUsuario: { set: (v: string) => void };
      enviado: () => boolean;
    };
    protegido.asuntoMensaje.set("asunto");
    protegido.cuerpoMensaje.set("cuerpo");
    protegido.emailUsuario.set("   ");

    componente.enviarPorEmail();
    expect(protegido.enviado()).toBeFalse();
  });

  it("enviarPorEmail postea el mensaje a /api/contacto y marca enviado", function() {
    const httpMock = TestBed.inject(HttpTestingController);
    const protegido = componente as unknown as {
      nombreUsuario: { set: (v: string) => void };
      emailUsuario: { set: (v: string) => void };
      asuntoMensaje: { set: (v: string) => void };
      cuerpoMensaje: { set: (v: string) => void };
      enviado: () => boolean;
    };
    protegido.nombreUsuario.set("Alejandro");
    protegido.emailUsuario.set("alex@test.com");
    protegido.asuntoMensaje.set("Asunto Test");
    protegido.cuerpoMensaje.set("Cuerpo Test");

    componente.enviarPorEmail();

    const req = httpMock.expectOne("/api/contacto");
    expect(req.request.method).toBe("POST");
    expect((req.request.body as { email: string }).email).toBe("alex@test.com");
    req.flush({ ok: true });

    expect(protegido.enviado()).toBeTrue();
    httpMock.verify();
  });

  it("resetearFormulario vacía todos los campos y enviado", function() {
    const protegido = componente as unknown as {
      nombreUsuario: { set: (v: string) => void; (): string };
      emailUsuario: { set: (v: string) => void; (): string };
      asuntoMensaje: { set: (v: string) => void; (): string };
      cuerpoMensaje: { set: (v: string) => void; (): string };
      enviado: { set: (v: boolean) => void; (): boolean };
    };
    protegido.nombreUsuario.set("X");
    protegido.emailUsuario.set("y@y.com");
    protegido.asuntoMensaje.set("a");
    protegido.cuerpoMensaje.set("b");
    protegido.enviado.set(true);

    componente.resetearFormulario();

    expect(protegido.nombreUsuario()).toBe("");
    expect(protegido.emailUsuario()).toBe("");
    expect(protegido.asuntoMensaje()).toBe("");
    expect(protegido.cuerpoMensaje()).toBe("");
    expect(protegido.enviado()).toBeFalse();
  });
});
