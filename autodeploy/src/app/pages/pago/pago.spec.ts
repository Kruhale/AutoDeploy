import { TestBed, fakeAsync, tick } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { provideRouter, Router, ActivatedRoute } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import { Pago } from "./pago";
import { UsuarioService } from "../../services/usuario.service";
import { PlanService } from "../../services/plan.service";

describe("Pago", function() {
  let componente: Pago;
  let httpMock: HttpTestingController;
  let usuarioService: UsuarioService;
  let planService: PlanService;
  let router: Router;
  let mapaQueryParams: Map<string, string>;

  beforeEach(async function() {
    mapaQueryParams = new Map<string, string>();
    const rutaActivadaMock = {
      snapshot: {
        queryParamMap: {
          get: function(clave: string): string | null {
            return mapaQueryParams.get(clave) ?? null;
          }
        }
      }
    };

    await TestBed.configureTestingModule({
      imports: [Pago, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: rutaActivadaMock }
      ]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    usuarioService = TestBed.inject(UsuarioService);
    planService = TestBed.inject(PlanService);
    router = TestBed.inject(Router);

    const fixture = TestBed.createComponent(Pago);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(function() {
    httpMock.verify();
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

  it("formatearNumeroTarjeta: aplica espacios y guarda el numero limpio", function() {
    const inputFalso = document.createElement("input");
    inputFalso.value = "4111111111111111";
    const evento = { target: inputFalso } as unknown as Event;
    componente.formatearNumeroTarjeta(evento);
    expect(componente.numeroTarjeta()).toBe("4111 1111 1111 1111");
    expect(inputFalso.value).toBe("4111 1111 1111 1111");
  });

  it("formatearNumeroTarjeta: limita a 15 digitos cuando es Amex", function() {
    componente.numeroTarjeta.set("34");
    const inputFalso = document.createElement("input");
    inputFalso.value = "378282246310005999";
    componente.formatearNumeroTarjeta({ target: inputFalso } as unknown as Event);
    expect(componente.numeroTarjeta().replace(/\s/g, "").length).toBe(15);
  });

  it("formatearFecha: inserta la barra tras el mes", function() {
    const inputFalso = document.createElement("input");
    inputFalso.value = "1235";
    componente.formatearFecha({ target: inputFalso } as unknown as Event);
    expect(componente.fechaExpiracion()).toBe("12/35");
  });

  it("formatearFecha: con menos de 2 digitos no inserta barra", function() {
    const inputFalso = document.createElement("input");
    inputFalso.value = "1";
    componente.formatearFecha({ target: inputFalso } as unknown as Event);
    expect(componente.fechaExpiracion()).toBe("1");
  });

  it("formatearCvv: limita a 3 digitos en tarjetas no Amex", function() {
    componente.numeroTarjeta.set("4111111111111111");
    const inputFalso = document.createElement("input");
    inputFalso.value = "1234567";
    componente.formatearCvv({ target: inputFalso } as unknown as Event);
    expect(componente.cvv().length).toBe(3);
  });

  it("formatearCvv: permite 4 digitos en Amex", function() {
    componente.numeroTarjeta.set("3782 822463 10005");
    const inputFalso = document.createElement("input");
    inputFalso.value = "12345";
    componente.formatearCvv({ target: inputFalso } as unknown as Event);
    expect(componente.cvv().length).toBe(4);
  });

  it("validarNumero: error si no pasa el algoritmo Luhn", function() {
    componente.numeroTarjeta.set("4111 1111 1111 1112");
    componente.validarNumero();
    expect(componente.errorNumero()).not.toBe("");
  });

  it("validarFecha: error con formato incorrecto sin barra", function() {
    componente.fechaExpiracion.set("1235");
    componente.validarFecha();
    expect(componente.errorFecha()).not.toBe("");
  });

  it("validarFecha: error si la tarjeta esta vencida", function() {
    componente.fechaExpiracion.set("01/20");
    componente.validarFecha();
    expect(componente.errorFecha()).not.toBe("");
  });

  it("validarCvv: longitud insuficiente para Amex", function() {
    componente.numeroTarjeta.set("3782 822463 10005");
    componente.cvv.set("12");
    componente.validarCvv();
    expect(componente.errorCvv()).not.toBe("");
  });

  it("ngOnInit selecciona el plan business si viene en queryParam", function() {
    mapaQueryParams.set("plan", "business");
    const fixture = TestBed.createComponent(Pago);
    fixture.detectChanges();
    expect(fixture.componentInstance.planSeleccionado()).toBe("business");
  });

  it("ngOnInit ignora un valor de plan invalido en queryParam", function() {
    mapaQueryParams.set("plan", "diamond");
    const fixture = TestBed.createComponent(Pago);
    fixture.detectChanges();
    expect(fixture.componentInstance.planSeleccionado()).toBe("pro");
  });

  it("infoDelPlan: devuelve datos para 'business'", function() {
    componente.planSeleccionado.set("business");
    expect(componente.infoDelPlan()).toBeDefined();
  });

  it("procesarPago: no hace nada si el formulario es invalido", async function() {
    componente.comprobacionNumero = false;
    await componente.procesarPago();
    expect(componente.estadoPago()).toBe("formulario");
  });

  it("procesarPago: redirige a /login si no hay usuarioId", async function() {
    componente.comprobacionNumero = true;
    componente.comprobacionNombre = true;
    componente.comprobacionFecha = true;
    componente.comprobacionCvv = true;
    usuarioService.usuarioId.set("");
    spyOn(console, "warn");
    const espiaNavegar = spyOn(router, "navigate");
    await componente.procesarPago();
    expect(espiaNavegar).toHaveBeenCalledWith(["/login"]);
  });

  it("procesarPago: estado 'exito' cuando el servicio responde OK", fakeAsync(function() {
    componente.comprobacionNumero = true;
    componente.comprobacionNombre = true;
    componente.comprobacionFecha = true;
    componente.comprobacionCvv = true;
    usuarioService.usuarioId.set("user-id-1");
    componente.planSeleccionado.set("pro");
    componente.procesarPago();
    expect(componente.estadoPago()).toBe("procesando");
    tick(2500);
    const peticion = httpMock.expectOne("/api/usuarios/user-id-1/plan");
    peticion.flush({ success: true, message: "OK", data: { id: "user-id-1", nombre: "x", email: "x@x.com", token: null, plan: "pro", fechaFinSuscripcion: null, idioma: "es" } });
    tick();
    expect(componente.estadoPago()).toBe("exito");
    expect(planService.planActual()).toBe("pro");
  }));

  it("procesarPago: estado 'error' cuando el servicio falla", fakeAsync(function() {
    componente.comprobacionNumero = true;
    componente.comprobacionNombre = true;
    componente.comprobacionFecha = true;
    componente.comprobacionCvv = true;
    usuarioService.usuarioId.set("user-id-1");
    componente.planSeleccionado.set("business");
    spyOn(console, "error");
    componente.procesarPago();
    tick(2500);
    const peticion = httpMock.expectOne("/api/usuarios/user-id-1/plan");
    peticion.flush({ success: false, message: "fallo", data: null });
    tick();
    expect(componente.estadoPago()).toBe("error");
  }));

  it("irAlDashboard navega a /app/dashboard", function() {
    const espiaNavegar = spyOn(router, "navigate");
    componente.irAlDashboard();
    expect(espiaNavegar).toHaveBeenCalledWith(["/app/dashboard"]);
  });

  it("reintentar restablece el estado a 'formulario'", function() {
    componente.estadoPago.set("error");
    componente.reintentar();
    expect(componente.estadoPago()).toBe("formulario");
  });

  it("comprobarFormularioCompleto: desactiva el boton si no hay validaciones", function() {
    const botonFalso = document.createElement("button");
    botonFalso.className = "pago__boton-pagar";
    document.body.appendChild(botonFalso);
    componente.numeroTarjeta.set("4111 1111 1111 1111");
    componente.validarNumero();
    expect(botonFalso.disabled).toBeTrue();
    document.body.removeChild(botonFalso);
  });

  it("comprobarFormularioCompleto: activa el boton cuando todas las validaciones pasan", function() {
    const botonFalso = document.createElement("button");
    botonFalso.className = "pago__boton-pagar";
    document.body.appendChild(botonFalso);
    componente.comprobacionNombre = true;
    componente.comprobacionFecha = true;
    componente.comprobacionCvv = true;
    componente.numeroTarjeta.set("4111 1111 1111 1111");
    componente.validarNumero();
    expect(botonFalso.disabled).toBeFalse();
    document.body.removeChild(botonFalso);
  });
});
