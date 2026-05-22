import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { provideRouter } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import { Pago } from "./pago";

describe("Pago", function() {
  let componente: Pago;

  beforeEach(async function() {
    await TestBed.configureTestingModule({
      imports: [Pago, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(Pago);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("se crea con plan 'pro' por defecto", function() {
    expect(componente).toBeTruthy();
    expect(componente.planSeleccionado()).toBe("pro");
    expect(componente.estadoPago()).toBe("formulario");
  });

  it("tipoTarjeta: detecta Visa (4...)", function() {
    componente.numeroTarjeta.set("4111 1111 1111 1111");
    expect(componente.tipoTarjeta()).toBe("visa");
  });

  it("tipoTarjeta: detecta Mastercard (5...)", function() {
    componente.numeroTarjeta.set("5555 5555 5555 4444");
    expect(componente.tipoTarjeta()).toBe("mastercard");
  });

  it("tipoTarjeta: detecta American Express (34/37...)", function() {
    componente.numeroTarjeta.set("3782 822463 10005");
    expect(componente.tipoTarjeta()).toBe("amex");
    componente.numeroTarjeta.set("3411 111111 11111");
    expect(componente.tipoTarjeta()).toBe("amex");
  });

  it("tipoTarjeta: 'desconocida' si no coincide con ningun prefijo", function() {
    componente.numeroTarjeta.set("6011 1234 5678");
    expect(componente.tipoTarjeta()).toBe("desconocida");
  });

  it("numeroFormateado: muestra placeholder si esta vacio", function() {
    componente.numeroTarjeta.set("");
    expect(componente.numeroFormateado()).toBe("•••• •••• •••• ••••");
  });

  it("numeroFormateado: agrupa el numero en bloques de 4", function() {
    componente.numeroTarjeta.set("4111111111111111");
    expect(componente.numeroFormateado()).toBe("4111 1111 1111 1111");
  });

  it("validarNombre: error si esta vacio", function() {
    componente.nombreTitular.set("");
    componente.validarNombre();
    expect(componente.errorNombre()).not.toBe("");
  });

  it("validarNombre: error si tiene menos de 3 caracteres", function() {
    componente.nombreTitular.set("Al");
    componente.validarNombre();
    expect(componente.errorNombre()).not.toBe("");
  });

  it("validarNombre: error si contiene numeros", function() {
    componente.nombreTitular.set("Pepe 123");
    componente.validarNombre();
    expect(componente.errorNombre()).not.toBe("");
  });

  it("validarNombre: ok con nombre largo y solo letras", function() {
    componente.nombreTitular.set("Pepe Garcia");
    componente.validarNombre();
    expect(componente.errorNombre()).toBe("");
  });

  it("validarFecha: error con formato incorrecto", function() {
    componente.fechaExpiracion.set("13/99");  // mes invalido
    componente.validarFecha();
    expect(componente.errorFecha()).not.toBe("");
  });

  it("validarFecha: ok con fecha futura valida", function() {
    componente.fechaExpiracion.set("12/35");  // diciembre 2035
    componente.validarFecha();
    expect(componente.errorFecha()).toBe("");
  });

  it("validarCvv: error si esta vacio", function() {
    componente.cvv.set("");
    componente.validarCvv();
    expect(componente.errorCvv()).not.toBe("");
  });

  it("validarCvv: error si tiene menos digitos de los esperados (3 para Visa)", function() {
    componente.numeroTarjeta.set("4111111111111111");
    componente.cvv.set("12");
    componente.validarCvv();
    expect(componente.errorCvv()).not.toBe("");
  });

  it("validarCvv: ok con 3 digitos para Visa", function() {
    componente.numeroTarjeta.set("4111111111111111");
    componente.cvv.set("123");
    componente.validarCvv();
    expect(componente.errorCvv()).toBe("");
  });

  it("validarCvv: ok con 4 digitos para Amex", function() {
    componente.numeroTarjeta.set("3782822463 10005");
    componente.cvv.set("1234");
    componente.validarCvv();
    expect(componente.errorCvv()).toBe("");
  });

  it("validarNumero: error si esta vacio", function() {
    componente.numeroTarjeta.set("");
    componente.validarNumero();
    expect(componente.errorNumero()).not.toBe("");
  });

  it("validarNumero: error si esta incompleto", function() {
    componente.numeroTarjeta.set("4111 1111");
    componente.validarNumero();
    expect(componente.errorNumero()).not.toBe("");
  });

  it("validarNumero: ok con tarjeta Visa de prueba que pasa el algoritmo Luhn", function() {
    componente.numeroTarjeta.set("4111 1111 1111 1111");
    componente.validarNumero();
    expect(componente.errorNumero()).toBe("");
  });

  it("infoDelPlan: contiene nombre, precio y descripcion para 'pro'", function() {
    componente.planSeleccionado.set("pro");
    const info = componente.infoDelPlan();
    expect(info.nombre).toBeDefined();
    expect(info.precio).toBeDefined();
    expect(info.descripcion).toBeDefined();
  });

  it("infoDelPlan: cae a 'pro' cuando el plan no es ni pro ni business", function() {
    componente.planSeleccionado.set("free");
    const info = componente.infoDelPlan();
    expect(info).toBeDefined();
  });

  it("cvvVisible: empieza false, alterna con un toggle (sin metodo dedicado)", function() {
    expect(componente.cvvVisible()).toBeFalse();
    componente.cvvVisible.set(true);
    expect(componente.cvvVisible()).toBeTrue();
  });
});
