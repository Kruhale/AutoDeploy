import { ComponentFixture, TestBed } from "@angular/core/testing";
import { HttpClientTestingModule } from "@angular/common/http/testing";
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

  it("enviarPorEmail compone enlace mailto y marca enviado en true", function() {
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

    // window.location no es siempre redefinible en navegadores modernos
    // (Chrome marca la propiedad como no configurable), asi que en vez de
    // sustituir el objeto entero interceptamos el setter de location.href
    // con un spy. Asi capturamos lo que el componente asigna sin tocar la
    // navegacion real.
    let hrefAsignado = "";
    const espia = spyOnProperty(window.location, "href", "set").and.callFake(function(valor: string) {
      hrefAsignado = valor;
    });

    componente.enviarPorEmail();
    expect(espia).toHaveBeenCalled();
    expect(hrefAsignado).toContain("mailto:contacto@autodeploy.dev");
    expect(hrefAsignado).toContain("subject=");
    expect(hrefAsignado).toContain("body=");
    expect(protegido.enviado()).toBeTrue();
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
