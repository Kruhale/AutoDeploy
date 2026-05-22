import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { Router } from "@angular/router";
import { RouterTestingModule } from "@angular/router/testing";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { Register } from "./register";
import { AuthService } from "../../services/auth.service";
import { UsuarioService } from "../../services/usuario.service";

describe("Register", function() {
  let component: Register;
  let fixture: ComponentFixture<Register>;
  let usuarioServiceSpy: jasmine.SpyObj<UsuarioService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let router: Router;
  let routerSpy: { navigate: jasmine.Spy };

  beforeEach(async function() {
    usuarioServiceSpy = jasmine.createSpyObj<UsuarioService>("UsuarioService", ["registrar", "login"]);
    authServiceSpy = jasmine.createSpyObj<AuthService>("AuthService", ["login"]);

    await TestBed.configureTestingModule({
      imports: [Register, TranslateModule.forRoot(), RouterTestingModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UsuarioService, useValue: usuarioServiceSpy },
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    routerSpy = { navigate: spyOn(router, "navigate") };

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("debe crear el componente", function() {
    expect(component).toBeTruthy();
  });

  it("inicializa el formulario reactivo con campos vacíos", function() {
    expect(component.formularioRegistro.controls.nombre.value).toBe("");
    expect(component.formularioRegistro.controls.email.value).toBe("");
    expect(component.formularioRegistro.controls.password.value).toBe("");
    expect(component.formularioRegistro.controls.confirmPassword.value).toBe("");
  });

  it("el formulario es invalido inicialmente (todos los campos required)", function() {
    expect(component.formularioRegistro.valid).toBeFalse();
  });

  it("inicializa la password oculta por defecto", function() {
    expect(component.passwordEsVisible()).toBeFalse();
    expect(component.confirmPasswordEsVisible()).toBeFalse();
  });

  it("inicia sin errores ni cargando", function() {
    expect(component.mensajeDeErrorVisible()).toBeFalse();
    expect(component.cargando()).toBeFalse();
  });

  it("criterio de longitud falla con password corta y pasa con 8+", function() {
    component.formularioRegistro.controls.password.setValue("ab");
    expect(component.criterioLongitud()).toBeFalse();
    component.formularioRegistro.controls.password.setValue("12345678");
    expect(component.criterioLongitud()).toBeTrue();
  });

  it("criterio mayuscula detecta correctamente", function() {
    component.formularioRegistro.controls.password.setValue("abcdefgh");
    expect(component.criterioMayuscula()).toBeFalse();
    component.formularioRegistro.controls.password.setValue("Abcdefgh");
    expect(component.criterioMayuscula()).toBeTrue();
  });

  it("criterio numero detecta correctamente", function() {
    component.formularioRegistro.controls.password.setValue("Abcdefgh");
    expect(component.criterioNumero()).toBeFalse();
    component.formularioRegistro.controls.password.setValue("Abcdefg1");
    expect(component.criterioNumero()).toBeTrue();
  });

  it("criterio especial detecta caracteres especiales", function() {
    component.formularioRegistro.controls.password.setValue("Abcdefg1");
    expect(component.criterioEspecial()).toBeFalse();
    component.formularioRegistro.controls.password.setValue("Abcdefg1!");
    expect(component.criterioEspecial()).toBeTrue();
  });

  it("passwordEsValida es true solo cuando se cumplen los 5 criterios", function() {
    component.formularioRegistro.controls.password.setValue("Abcdefg1!");
    expect(component.passwordEsValida()).toBeTrue();
  });

  it("hayConfirmacionInvalida es true cuando confirmPassword no coincide y se ha intentado enviar", function() {
    component.formularioRegistro.patchValue({
      nombre: "Pepe",
      email: "p@x.com",
      password: "Abcdefg1!",
      confirmPassword: "distinto"
    });
    component.formularioRegistro.controls.confirmPassword.markAsTouched();

    expect(component.hayConfirmacionInvalida()).toBeTrue();
  });

  it("hayConfirmacionInvalida es false si las contraseñas coinciden", function() {
    component.formularioRegistro.patchValue({
      nombre: "Pepe",
      email: "p@x.com",
      password: "Abcdefg1!",
      confirmPassword: "Abcdefg1!"
    });
    component.formularioRegistro.controls.confirmPassword.markAsTouched();
    expect(component.hayConfirmacionInvalida()).toBeFalse();
  });

  it("criterio minuscula detecta correctamente", function() {
    component.formularioRegistro.controls.password.setValue("ABCDEFG1");
    expect(component.criterioMinuscula()).toBeFalse();
    component.formularioRegistro.controls.password.setValue("ABCDEFGa");
    expect(component.criterioMinuscula()).toBeTrue();
  });

  it("alternarVisibilidadPassword cambia el signal", function() {
    expect(component.passwordEsVisible()).toBeFalse();
    component.alternarVisibilidadPassword();
    expect(component.passwordEsVisible()).toBeTrue();
    component.alternarVisibilidadPassword();
    expect(component.passwordEsVisible()).toBeFalse();
  });

  it("alternarVisibilidadConfirmPassword cambia el signal", function() {
    expect(component.confirmPasswordEsVisible()).toBeFalse();
    component.alternarVisibilidadConfirmPassword();
    expect(component.confirmPasswordEsVisible()).toBeTrue();
  });

  it("passwordEnElInput devuelve el valor actual del control", function() {
    component.formularioRegistro.controls.password.setValue("MiClave1!");
    expect(component.passwordEnElInput()).toBe("MiClave1!");
  });

  it("campoConError es true si el control es invalido y está tocado", function() {
    const control = component.formularioRegistro.controls.email;
    control.setValue("no-es-email");
    control.markAsTouched();
    expect(component.campoConError("email")).toBeTrue();
  });

  it("campoConError es false si el control es valido", function() {
    const control = component.formularioRegistro.controls.nombre;
    control.setValue("Alejandro");
    control.markAsTouched();
    expect(component.campoConError("nombre")).toBeFalse();
  });

  it("codigoSesion tiene 6 caracteres hexadecimales", function() {
    expect(component.codigoSesion.length).toBe(6);
    expect(/^[0-9A-F]{6}$/.test(component.codigoSesion)).toBeTrue();
  });

  it("crearCuenta muestra error si password no es valida", async function() {
    const traduccion = TestBed.inject(TranslateService);
    spyOn(traduccion, "instant").and.returnValue("err");

    component.formularioRegistro.patchValue({
      nombre: "Ale",
      email: "a@a.com",
      password: "corta",
      confirmPassword: "corta"
    });

    await component.crearCuenta();

    expect(component.mensajeDeErrorVisible()).toBeTrue();
    expect(usuarioServiceSpy.registrar).not.toHaveBeenCalled();
  });

  it("crearCuenta muestra error si las contraseñas no coinciden", async function() {
    const traduccion = TestBed.inject(TranslateService);
    spyOn(traduccion, "instant").and.callFake(function(clave: string) {
      return clave;
    });

    component.formularioRegistro.patchValue({
      nombre: "Ale",
      email: "a@a.com",
      password: "Abcdefg1!",
      confirmPassword: "Otra1Distinta!"
    });

    await component.crearCuenta();

    expect(component.mensajeDeErrorVisible()).toBeTrue();
    expect(component.mensajeDeError()).toBe("register.errorPasswordsNoCoinciden");
  });

  it("crearCuenta muestra error de campos vacios si el form es invalido pero password ok", async function() {
    const traduccion = TestBed.inject(TranslateService);
    spyOn(traduccion, "instant").and.callFake(function(clave: string) {
      return clave;
    });

    component.formularioRegistro.patchValue({
      nombre: "",
      email: "",
      password: "Abcdefg1!",
      confirmPassword: "Abcdefg1!"
    });

    await component.crearCuenta();
    expect(component.mensajeDeErrorVisible()).toBeTrue();
    expect(component.mensajeDeError()).toBe("register.errorCamposVacios");
  });

  it("crearCuenta exitoso llama a registrar, login y navega a /app", async function() {
    usuarioServiceSpy.registrar.and.returnValue(Promise.resolve({} as any));
    usuarioServiceSpy.login.and.returnValue(Promise.resolve({} as any));

    component.formularioRegistro.patchValue({
      nombre: "Alejandro",
      email: "ale@ale.com",
      password: "Abcdefg1!",
      confirmPassword: "Abcdefg1!"
    });

    await component.crearCuenta();

    expect(usuarioServiceSpy.registrar).toHaveBeenCalledWith("Alejandro", "ale@ale.com", "Abcdefg1!");
    expect(usuarioServiceSpy.login).toHaveBeenCalledWith("ale@ale.com", "Abcdefg1!");
    expect(authServiceSpy.login).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(["/app"]);
    expect(component.cargando()).toBeFalse();
  });

  it("crearCuenta muestra el mensaje de error si registrar lanza excepcion", async function() {
    usuarioServiceSpy.registrar.and.returnValue(Promise.reject(new Error("Email ya existe")));

    component.formularioRegistro.patchValue({
      nombre: "Alejandro",
      email: "ale@ale.com",
      password: "Abcdefg1!",
      confirmPassword: "Abcdefg1!"
    });

    await component.crearCuenta();

    expect(component.mensajeDeErrorVisible()).toBeTrue();
    expect(component.mensajeDeError()).toBe("Email ya existe");
    expect(component.cargando()).toBeFalse();
  });

  it("crearCuenta usa el mensaje por defecto si el error no tiene message", async function() {
    const traduccion = TestBed.inject(TranslateService);
    spyOn(traduccion, "instant").and.callFake(function(clave: string) {
      return clave;
    });
    usuarioServiceSpy.registrar.and.returnValue(Promise.reject({}));

    component.formularioRegistro.patchValue({
      nombre: "Alejandro",
      email: "ale@ale.com",
      password: "Abcdefg1!",
      confirmPassword: "Abcdefg1!"
    });

    await component.crearCuenta();
    expect(component.mensajeDeError()).toBe("register.errorRegistro");
  });
});
